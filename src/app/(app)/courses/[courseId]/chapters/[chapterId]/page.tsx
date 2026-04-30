import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Sparkles, BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GenerateButton, GenerateFromSelection, GenerateOneFile } from "./client";
import { safeJSON } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import {
  AddFlashcardButton,
  EditFlashcardButton,
  DeleteFlashcardButton,
} from "@/components/flashcard-editor";
import { EditSummaryButton } from "@/components/summary-editor";

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
        include: { _count: { select: { flashcards: true, quizzes: true } } },
        orderBy: { name: "asc" },
      },
      summary: true,
      flashcards: { orderBy: { createdAt: "asc" } },
      quizzes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!chapter) notFound();

  const keyPoints = safeJSON<string[]>(chapter.summary?.keyPoints, []);
  const glossary = safeJSON<{ term: string; definition: string }[]>(
    chapter.summary?.glossary ?? null,
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour aux cours
        </Link>
        <span>/</span>
        <Link href={`/courses`} className="hover:text-foreground">
          {chapter.course.title}
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{chapter.title}</h1>
          <p className="text-muted-foreground">
            {chapter.documents.length} documents · {chapter.flashcards.length} flashcards ·{" "}
            {chapter.quizzes.length} questions
          </p>
        </div>
        <div className="flex gap-2">
          {chapter.flashcards.length > 0 ? (
            <Button asChild>
              <Link href={`/study?chapterId=${chapter.id}`}>
                <Sparkles className="h-4 w-4" /> Réviser ce chapitre
              </Link>
            </Button>
          ) : null}
          <GenerateButton chapterId={chapter.id} hasContent={!!chapter.summary} />
        </div>
      </div>

      {!chapter.summary ? (
        <Card className="border-dashed">
          <CardContent className="py-8 space-y-4">
            <div className="text-center space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-primary" />
              <h3 className="font-semibold">Pas encore de contenu généré</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Le contenu généré est stocké en local — tu ne paies qu&apos;une fois par chapitre.
                Pour économiser, commence par tester sur 1 ou 2 fichiers.
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <GenerateFromSelection
                chapterId={chapter.id}
                documents={chapter.documents.map((d) => ({
                  id: d.id,
                  name: d.name,
                  rawText: d.rawText,
                }))}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Résumé</TabsTrigger>
            <TabsTrigger value="full">Fiche détaillée</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards ({chapter.flashcards.length})</TabsTrigger>
            <TabsTrigger value="quiz">QCM & cas ({chapter.quizzes.length})</TabsTrigger>
            <TabsTrigger value="docs">Documents ({chapter.documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Résumé express</CardTitle>
                    <CardDescription>
                      Pour réviser en 1 minute. {chapter.summary.edited ? "(modifié à la main)" : ""}
                    </CardDescription>
                  </div>
                  <EditSummaryButton
                    chapterId={chapter.id}
                    initial={{
                      short: chapter.summary.short,
                      full: chapter.summary.full,
                      keyPoints,
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base leading-relaxed">{chapter.summary.short}</p>
                {keyPoints.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-2">Points clés</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-sm">
                      {keyPoints.map((kp, i) => (
                        <li key={i}>{kp}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {glossary.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-2">Glossaire</h4>
                    <div className="grid gap-2">
                      {glossary.map((g, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="font-medium text-sm">{g.term}</div>
                          <div className="text-sm text-muted-foreground">{g.definition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="full">
            <Card>
              <CardContent className="pt-6">
                <Markdown>{chapter.summary.full}</Markdown>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {chapter.flashcards.length} carte{chapter.flashcards.length > 1 ? "s" : ""} ·{" "}
                {chapter.flashcards.filter((c) => c.custom).length} créée(s) à la main
              </p>
              <AddFlashcardButton chapterId={chapter.id} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {chapter.flashcards.map((fc) => (
                <Card key={fc.id}>
                  <CardContent className="pt-5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">{fc.question}</p>
                        {fc.hint ? (
                          <p className="text-xs text-muted-foreground italic">
                            Indice : {fc.hint}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-start gap-1 shrink-0">
                        <Badge variant={difficultyVariant(fc.difficulty)} className="h-5">
                          {fc.difficulty}
                        </Badge>
                        {fc.custom ? <Badge variant="outline" className="h-5">custom</Badge> : null}
                        {fc.edited && !fc.custom ? (
                          <Badge variant="outline" className="h-5">édité</Badge>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fc.answer}</p>
                    <div className="flex justify-end gap-1 pt-1">
                      <EditFlashcardButton card={fc} />
                      <DeleteFlashcardButton cardId={fc.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quiz">
            <div className="grid gap-3">
              {chapter.quizzes.map((q) => {
                const choices = safeJSON<string[]>(q.choices, []);
                return (
                  <Card key={q.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={q.type === "case" ? "default" : "secondary"}>
                          {q.type === "case" ? "Cas pratique" : "QCM"}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-1">{q.question}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {choices.length > 0 ? (
                        <ul className="space-y-1">
                          {choices.map((c, i) => (
                            <li key={i} className="text-muted-foreground">
                              {c}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <details className="rounded-lg border p-3 bg-accent/30">
                        <summary className="cursor-pointer font-medium">Voir la correction</summary>
                        <p className="mt-2 whitespace-pre-wrap">{q.answer}</p>
                        {q.explanation ? (
                          <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
                        ) : null}
                      </details>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fichiers du chapitre</CardTitle>
                <CardDescription>
                  Chaque fichier est traité indépendamment. Génère ou régénère un fichier sans
                  toucher aux autres.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {chapter.documents.map((d) => {
                    const cardCount = d._count.flashcards;
                    const quizCount = d._count.quizzes;
                    const processed = cardCount > 0 || quizCount > 0;
                    return (
                      <li key={d.id} className="flex items-center gap-3 py-3">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{d.name}</span>
                            {processed ? (
                              <Badge variant="success" className="h-5">traité</Badge>
                            ) : (
                              <Badge variant="outline" className="h-5">non traité</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {d.rawText ? `${Math.round(d.rawText.length / 1000)}k car.` : "non extrait"}
                            {processed
                              ? ` · ${cardCount} cartes · ${quizCount} quiz`
                              : ""}
                          </div>
                        </div>
                        <a
                          className="text-primary text-xs hover:underline shrink-0"
                          href={`https://drive.google.com/file/d/${d.driveFileId}/view`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Drive ↗
                        </a>
                        <GenerateOneFile
                          chapterId={chapter.id}
                          documentId={d.id}
                          processed={processed}
                        />
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function difficultyVariant(d: string): "secondary" | "warning" | "destructive" {
  if (d === "hard") return "destructive";
  if (d === "easy") return "secondary";
  return "warning";
}
