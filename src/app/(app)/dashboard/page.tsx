import Link from "next/link";
import {
  Flame,
  Target,
  Clock,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Calendar,
  Zap,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heatmap } from "@/components/heatmap";
import { daysBetween } from "@/lib/utils";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const data = await getDashboardData(user.id);

  const goalMin = data.prefs?.dailyGoalMin ?? 15;
  const todayMin = data.today?.minutes ?? 0;
  const todayPct = Math.min(100, Math.round((todayMin / goalMin) * 100));
  const todayCards = data.today?.cardsSeen ?? 0;
  const todayAcc =
    todayCards > 0 ? Math.round(((data.today?.cardsRight ?? 0) / todayCards) * 100) : 0;

  const examDate = data.prefs?.examDate || (process.env.NEXT_PUBLIC_EXAM_DATE ? new Date(process.env.NEXT_PUBLIC_EXAM_DATE) : null);
  const daysToExam = examDate ? daysBetween(new Date(), new Date(examDate)) : null;

  const heatmapData = data.dailyLogs.map((l) => ({
    date: l.date,
    minutes: l.minutes,
    cards: l.cardsSeen,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Salut {user.name?.split(" ")[0] || "👋"}
          </h1>
          <p className="text-muted-foreground">
            {todayMin >= goalMin
              ? "Objectif du jour atteint, bravo ! 🎉"
              : "Voici ton plan de révision pour aujourd'hui."}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/study">
            Démarrer ma session <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Streak"
          value={`${data.streak} j`}
          hint={data.streak > 0 ? "Continue comme ça !" : "Lance ta première session"}
        />
        <StatCard
          icon={<Target className="h-4 w-4 text-primary" />}
          label="À réviser aujourd'hui"
          value={`${data.dueCount}`}
          hint="cartes prêtes"
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4 text-blue-500" />}
          label="Cours suivis"
          value={`${data.totalCourses}`}
          hint={`${data.totalCards} cartes au total`}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4 text-purple-500" />}
          label="Examen"
          value={daysToExam !== null ? `J-${daysToExam}` : "—"}
          hint={daysToExam !== null ? "jours restants" : "Définis la date dans Paramètres"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today goal */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Ton objectif du jour
            </CardTitle>
            <CardDescription>
              {todayMin} / {goalMin} minutes • {todayCards} cartes vues
              {todayCards > 0 ? ` • ${todayAcc}% de réussite` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={todayPct} />
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/quick">
                  <Zap className="h-4 w-4" /> Session de 5 min
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/study">Session complète</Link>
              </Button>
              {data.dueCount > 0 ? (
                <Badge variant="warning" className="self-center">
                  {data.dueCount} cartes en attente
                </Badge>
              ) : (
                <Badge variant="success" className="self-center">
                  Tout est à jour ✨
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 30-day stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> 30 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row icon={<Clock className="h-4 w-4" />} label="Temps étudié" value={`${data.totalMinutes30} min`} />
            <Row icon={<BookOpen className="h-4 w-4" />} label="Cartes vues" value={`${data.totalCards30}`} />
            <Row icon={<Trophy className="h-4 w-4" />} label="Précision" value={`${data.accuracy30}%`} />
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Régularité</CardTitle>
          <CardDescription>
            Chaque case = un jour. Plus c&apos;est foncé, plus tu as révisé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap data={heatmapData} weeks={26} />
        </CardContent>
      </Card>

      {/* Recent sessions */}
      {data.recentSessions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tes dernières sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.recentSessions.map((s) => {
                const acc =
                  s.cardsSeen > 0 ? Math.round((s.cardsRight / s.cardsSeen) * 100) : 0;
                return (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(s.startedAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>
                      {s.cardsSeen} cartes • {Math.round(s.durationSec / 60)} min •{" "}
                      <span className={acc >= 70 ? "text-success" : acc >= 50 ? "text-warning" : "text-destructive"}>
                        {acc}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {data.totalCourses === 0 ? (
        <Card className="border-primary/40 bg-accent/30">
          <CardHeader>
            <CardTitle>Premier pas : importe tes cours</CardTitle>
            <CardDescription>
              Connecte ton Google Drive et choisis le dossier qui contient tes cours de comptabilité.
              L&apos;app va générer fiches, résumés et flashcards automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/courses">Importer depuis Drive</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
