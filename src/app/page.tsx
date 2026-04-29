import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  GraduationCap,
  Brain,
  CalendarHeart,
  LineChart,
  Zap,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/40">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Compta Companion</span>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">Se connecter</Link>
        </Button>
      </header>

      <section className="container py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3 text-primary" />
          Ton compagnon de révision propulsé par Claude
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Réussis ton examen de comptabilité,
          <br />
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            quelques minutes par jour.
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Connecte ton Google Drive, laisse l&apos;IA générer fiches, résumés et flashcards depuis tes
          cours, puis révise grâce à la répétition espacée. Sur ordi, iPad ou iPhone.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="xl">
            <Link href="/login">Commencer maintenant</Link>
          </Button>
        </div>
      </section>

      <section className="container pb-24 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Brain,
            title: "Génération automatique",
            text: "L'IA transforme tes PDF en fiches synthétiques, flashcards Q/R, QCM et cas pratiques.",
          },
          {
            icon: CalendarHeart,
            title: "Répétition espacée",
            text: "Algorithme SM-2 (style Anki) : tu revois chaque carte au bon moment.",
          },
          {
            icon: LineChart,
            title: "Tableau de bord motivant",
            text: "Streak, heatmap, progression, faiblesses détectées : reste motivé jusqu'à l'examen.",
          },
          {
            icon: Zap,
            title: "Mode 5 minutes",
            text: "Pas le temps ? L'app sélectionne les cartes les plus urgentes pour une session ultra-courte.",
          },
          {
            icon: Sparkles,
            title: "Cas pratiques IA",
            text: "Écritures comptables et bilans générés depuis tes cours, avec correction immédiate.",
          },
          {
            icon: GraduationCap,
            title: "100% mobile",
            text: "Interface responsive pensée pour réviser dans le métro depuis ton iPhone ou iPad.",
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
