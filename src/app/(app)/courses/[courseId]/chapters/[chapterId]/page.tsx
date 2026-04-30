import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Sparkles, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ChapterPage({
  params,
}: {
  params: { courseId: string; chapterId: string };
}) {
  const user = (await getCurrentUser())!;
  const chapter = await prisma.chapter.findFirst({
    where: { id: params.chapterId, course: { userId: user.id } },
    include: {
      course: true,
      documents: {
        include: {
          summary: { select: { short: true } },
          _count: { select: { flashcards: true, quizzes: true } },
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!chapter) notFound();

  const totalCards = chapter.documents.reduce((a, d) => a + d._count.flashcards, 0);
  const totalQuiz = chapter.documents.reduce((a, d) => a + d._count.quizzes, 0);
  const generatedDocs = chapter.documents.filter((d) => d.summary).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour aux cours
        </Link>
        <span>/</span>
        <span>{chapter.course.title}</span>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{chapter.title}</h1>
          <p className="text-muted-foreground">
            {chapter.documents.length} document{chapter.documents.length > 1 ? "s" : ""} ·{" "}
            {generatedDocs}/{chapter.documents.length} traité{generatedDocs > 1 ? "s" : ""} ·{" "}
            {totalCards} cartes · {totalQuiz} quiz
          </p>
        </div>
        {totalCards > 0 ? (
          <Button asChild>
            <Link href={`/study?chapterId=${chapter.id}`}>
              <Sparkles className="h-4 w-4" /> Réviser tout le chapitre
            </Link>
          </Button>
        ) : null}
      </div>

      {chapter.documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun fichier dans ce dossier Drive.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {chapter.documents.map((d) => {
            const processed = !!d.summary;
            const cards = d._count.flashcards;
            const quiz = d._count.quizzes;
            return (
              <Link
                key={d.id}
                href={`/courses/${chapter.course.id}/chapters/${chapter.id}/documents/${d.id}`}
                className="group block"
              >
                <Card className="transition-colors group-hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{d.name}</CardTitle>
                          <CardDescription className="mt-0.5">
                            {processed
                              ? `${cards} cartes · ${quiz} quiz`
                              : "Pas encore généré"}
                            {d.rawText ? ` · ${Math.round(d.rawText.length / 1000)}k car.` : ""}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {processed ? (
                          <Badge variant="success" className="h-5">traité</Badge>
                        ) : (
                          <Badge variant="outline" className="h-5">à générer</Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardHeader>
                  {processed && d.summary?.short ? (
                    <CardContent className="pt-0 pl-11">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {d.summary.short}
                      </p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
