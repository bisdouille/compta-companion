import Link from "next/link";
import { BookOpen, FileText, Layers } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoursesActions } from "./client";

export default async function CoursesPage() {
  const user = (await getCurrentUser())!;
  const [courses, prefs] = await Promise.all([
    prisma.course.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        chapters: {
          include: {
            documents: {
              include: {
                summary: { select: { id: true } },
                _count: { select: { flashcards: true } },
              },
            },
          },
        },
      },
    }),
    prisma.userPreference.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes cours</h1>
          <p className="text-muted-foreground">
            {prefs?.driveRootFolder
              ? "Les cours sont stockés en local. Clique sur « Mettre à jour » seulement après avoir ajouté de nouveaux fichiers au Drive."
              : "Connecte un dossier Drive pour démarrer (une seule fois)."}
          </p>
        </div>
        <CoursesActions hasRoot={!!prefs?.driveRootFolder} />
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-accent flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Aucun cours pour l&apos;instant</h3>
              <p className="text-sm text-muted-foreground">
                Connecte ton Drive et choisis le dossier qui contient tes cours.
              </p>
            </div>
            <CoursesActions hasRoot={false} primary />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {courses.map((c) => {
          const allDocs = c.chapters.flatMap((ch) => ch.documents);
          const totalDocs = allDocs.length;
          const totalCards = allDocs.reduce((a, d) => a + d._count.flashcards, 0);
          const processedDocs = allDocs.filter((d) => d.summary).length;
          return (
            <Card key={c.id} style={{ borderTopColor: c.color, borderTopWidth: 3 }}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{c.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {c.chapters.length} chapitres · {totalDocs} fichiers · {totalCards} cartes
                    </CardDescription>
                  </div>
                  <Badge variant={processedDocs === totalDocs && totalDocs > 0 ? "success" : "secondary"}>
                    {processedDocs}/{totalDocs} traités
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {c.chapters.map((ch) => {
                    const chDocs = ch.documents.length;
                    const chProcessed = ch.documents.filter((d) => d.summary).length;
                    const chCards = ch.documents.reduce((a, d) => a + d._count.flashcards, 0);
                    return (
                      <li key={ch.id}>
                        <Link
                          href={`/courses/${c.id}/chapters/${ch.id}`}
                          className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                        >
                          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate text-sm font-medium">{ch.title}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" /> {chDocs}
                            </span>
                            <span>{chCards} cartes</span>
                            <Badge
                              variant={chProcessed === chDocs && chDocs > 0 ? "success" : "outline"}
                              className="h-5"
                            >
                              {chProcessed}/{chDocs}
                            </Badge>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
