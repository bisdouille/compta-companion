import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Heatmap } from "@/components/heatmap";
import { ActivityCharts } from "./client";

export default async function StatsPage() {
  const user = (await getCurrentUser())!;

  const [logs, courses, hardestCards, totalReviews, totalRight] = await Promise.all([
    prisma.dailyLog.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      take: 365,
    }),
    prisma.course.findMany({
      where: { userId: user.id },
      include: {
        chapters: {
          include: {
            documents: {
              include: {
                flashcards: {
                  include: { reviews: { where: { userId: user.id } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.flashcard.findMany({
      where: {
        document: { chapter: { course: { userId: user.id } } },
        reviews: { some: { userId: user.id } },
      },
      include: {
        document: { include: { chapter: { include: { course: true } } } },
        reviews: { where: { userId: user.id } },
      },
      take: 200,
    }),
    prisma.review.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { userId: user.id, lastQuality: { gte: 3 } } }),
  ]);

  // Mastery per course
  const masteryByCourse = courses.map((c) => {
    const cards = c.chapters.flatMap((ch) => ch.documents.flatMap((d) => d.flashcards));
    const total = cards.length;
    const mastered = cards.filter((card) => {
      const r = card.reviews[0];
      return r && r.repetitions >= 2 && (r.lastQuality ?? 0) >= 3;
    }).length;
    const seen = cards.filter((card) => card.reviews.length > 0).length;
    return {
      id: c.id,
      title: c.title,
      total,
      mastered,
      seen,
      pct: total > 0 ? Math.round((mastered / total) * 100) : 0,
    };
  });

  // Hardest cards (lowest ease, most failures)
  const ranked = hardestCards
    .map((c) => {
      const r = c.reviews[0];
      return r
        ? {
            id: c.id,
            question: c.question,
            chapter: c.document.chapter.title,
            course: c.document.chapter.course.title,
            ease: r.ease,
            lastQuality: r.lastQuality ?? 5,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a!.ease - b!.ease))
    .slice(0, 10);

  const accuracy = totalReviews > 0 ? Math.round((totalRight / totalReviews) * 100) : 0;

  const heatmapData = logs.map((l) => ({
    date: l.date,
    minutes: l.minutes,
    cards: l.cardsSeen,
  }));

  const last30 = logs.slice(-30).map((l) => ({
    date: l.date.slice(5),
    minutes: l.minutes,
    cards: l.cardsSeen,
    accuracy: l.cardsSeen > 0 ? Math.round((l.cardsRight / l.cardsSeen) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
        <p className="text-muted-foreground">Suis ta progression et identifie tes points faibles.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Précision globale</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold">{accuracy}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Cartes révisées</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totalReviews}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Jours actifs</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold">{logs.filter((l) => l.minutes > 0).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activité (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityCharts data={last30} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Régularité</CardTitle>
          <CardDescription>Vue annuelle façon bullet journal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap data={heatmapData} weeks={52} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maîtrise par cours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {masteryByCourse.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun cours pour l&apos;instant.</p>
          ) : (
            masteryByCourse.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{m.title}</span>
                  <span className="text-muted-foreground">
                    {m.mastered}/{m.total} cartes maîtrisées ({m.pct}%)
                  </span>
                </div>
                <Progress value={m.pct} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {ranked.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cartes les plus difficiles</CardTitle>
            <CardDescription>Concentre-toi dessus pour progresser plus vite.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {ranked.map((c) => (
                <li key={c!.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{c!.question}</div>
                    <div className="text-xs text-muted-foreground">
                      {c!.course} · {c!.chapter}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    facilité {c!.ease.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
