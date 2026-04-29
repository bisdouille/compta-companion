"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  RotateCw,
  Loader2,
  Trophy,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CardItem = {
  id: string;
  question: string;
  answer: string;
  hint?: string | null;
  difficulty: string;
  chapter: { id: string; title: string };
  course: { id: string; title: string };
};

export function StudySession({
  chapterId,
  courseId,
  mode,
}: {
  chapterId?: string;
  courseId?: string;
  mode: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ right: number; wrong: number; perChapter: Record<string, { right: number; wrong: number; title: string }> }>({
    right: 0,
    wrong: 0,
    perChapter: {},
  });
  const [done, setDone] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const params = new URLSearchParams();
        if (chapterId) params.set("chapterId", chapterId);
        if (courseId) params.set("courseId", courseId);
        params.set("mode", mode);
        const [qRes, sRes] = await Promise.all([
          fetch(`/api/study/queue?${params.toString()}`),
          fetch(`/api/study/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode }),
          }),
        ]);
        const qData = (await qRes.json()) as { cards: CardItem[] };
        const sData = (await sRes.json()) as { id: string };
        if (cancelled) return;
        setCards(qData.cards);
        setSessionId(sData.id);
      } catch (e) {
        toast.error("Erreur de chargement : " + (e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [chapterId, courseId, mode]);

  const current = cards[idx];

  async function rate(rating: "again" | "hard" | "good" | "easy") {
    if (!current || !sessionId) return;
    const isWrong = rating === "again";
    const nextStats = {
      right: stats.right + (isWrong ? 0 : 1),
      wrong: stats.wrong + (isWrong ? 1 : 0),
      perChapter: {
        ...stats.perChapter,
        [current.chapter.id]: {
          title: current.chapter.title,
          right: (stats.perChapter[current.chapter.id]?.right ?? 0) + (isWrong ? 0 : 1),
          wrong: (stats.perChapter[current.chapter.id]?.wrong ?? 0) + (isWrong ? 1 : 0),
        },
      },
    };
    setStats(nextStats);

    fetch("/api/study/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: current.id, rating, sessionId }),
    }).catch(() => undefined);

    if (idx + 1 >= cards.length) {
      await finalize(nextStats);
      setDone(true);
    } else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  async function finalize(s: { right: number; wrong: number }) {
    if (!sessionId) return;
    const durationSec = Math.round((Date.now() - startRef.current) / 1000);
    await fetch(`/api/study/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalize: true,
        durationSec,
        cardsSeen: s.right + s.wrong,
        cardsRight: s.right,
        cardsWrong: s.wrong,
      }),
    }).catch(() => undefined);
  }

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped) {
        if (e.key === "1") rate("again");
        else if (e.key === "2") rate("hard");
        else if (e.key === "3") rate("good");
        else if (e.key === "4") rate("easy");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, done, idx, current]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Sparkles className="h-10 w-10 mx-auto text-primary" />
          <h3 className="font-semibold">Rien à réviser pour l&apos;instant 🎉</h3>
          <p className="text-sm text-muted-foreground">
            Toutes tes cartes sont à jour. Reviens demain ou importe un nouveau cours.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/courses">Mes cours</Link>
            </Button>
            <Button asChild>
              <Link href="/study?mode=all">Forcer une session</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    const total = stats.right + stats.wrong;
    const acc = total ? Math.round((stats.right / total) * 100) : 0;
    const durationMin = Math.round((Date.now() - startRef.current) / 60000);
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-2xl">Session terminée !</CardTitle>
            <CardDescription>
              {durationMin} min · {total} cartes ·{" "}
              <span className={cn("font-semibold", acc >= 70 ? "text-success" : acc >= 50 ? "text-warning" : "text-destructive")}>
                {acc}% de réussite
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <SummaryStat icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Réussies" value={`${stats.right}`} />
            <SummaryStat icon={<XCircle className="h-4 w-4 text-destructive" />} label="Erreurs" value={`${stats.wrong}`} />
            <SummaryStat icon={<Clock className="h-4 w-4" />} label="Durée" value={`${durationMin} min`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détail par chapitre</CardTitle>
            <CardDescription>Là où tu as réussi, là où tu as buté.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(stats.perChapter).map(([id, s]) => {
                const t = s.right + s.wrong;
                const a = t ? Math.round((s.right / t) * 100) : 0;
                return (
                  <li key={id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{s.title}</span>
                      <span className={a >= 70 ? "text-success" : a >= 50 ? "text-warning" : "text-destructive"}>
                        {s.right}/{t} ({a}%)
                      </span>
                    </div>
                    <Progress value={a} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Retour au tableau de bord
          </Button>
          <Button onClick={() => router.refresh()}>
            <RotateCw className="h-4 w-4" /> Nouvelle session
          </Button>
        </div>
      </div>
    );
  }

  const progress = (idx / cards.length) * 100;
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Carte {idx + 1} / {cards.length} · {current.course.title} · {current.chapter.title}
          </span>
          <span className="flex items-center gap-2">
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats.right}
            </Badge>
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              {stats.wrong}
            </Badge>
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <div
        className="card-flip-container cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        <div className={cn("card-flip relative min-h-[300px]", flipped && "flipped")}>
          <Card className="card-flip-face absolute inset-0 flex items-center justify-center">
            <CardContent className="text-center space-y-3 p-8">
              <Badge variant="secondary">Question</Badge>
              <p className="text-xl font-medium leading-relaxed">{current.question}</p>
              {current.hint ? (
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer">Indice</summary>
                  <p className="mt-2">{current.hint}</p>
                </details>
              ) : null}
              <p className="text-xs text-muted-foreground pt-4">
                Clique ou appuie sur <kbd className="rounded border px-1">Espace</kbd> pour voir la réponse
              </p>
            </CardContent>
          </Card>
          <Card className="card-flip-face card-flip-back absolute inset-0 flex items-center justify-center bg-accent/40">
            <CardContent className="text-center space-y-3 p-8">
              <Badge variant="default">Réponse</Badge>
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{current.answer}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {flipped ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="destructive" onClick={() => rate("again")}>
            Encore <kbd className="ml-1 text-[10px] opacity-75">1</kbd>
          </Button>
          <Button variant="warning" onClick={() => rate("hard")}>
            Difficile <kbd className="ml-1 text-[10px] opacity-75">2</kbd>
          </Button>
          <Button variant="success" onClick={() => rate("good")}>
            Bien <kbd className="ml-1 text-[10px] opacity-75">3</kbd>
          </Button>
          <Button variant="default" onClick={() => rate("easy")}>
            Facile <kbd className="ml-1 text-[10px] opacity-75">4</kbd>
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <Button size="lg" onClick={() => setFlipped(true)}>
            Voir la réponse <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
