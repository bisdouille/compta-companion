import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { safeJSON } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import {
  AddFlashcardButton,
  EditFlashcardButton,
  DeleteFlashcardButton,
} from "@/components/flashcard-editor";
import { EditSummaryButton } from "@/components/summary-editor";
import { GenerateDocumentButton, DeleteDocumentContentButton } from "./client";

export default async function DocumentPage({
  params,
}: {
  params: { courseId: string; chapterId: string; documentId: string };
}) {
  const user = (await getCurrentUser())!;
  const doc = await prisma.document.findFirst({
    where: { id: params.documentId, chapter: { course: { userId: user.id } } },
    include: {
      chapter: { include: { course: true } },
      summary: true,
      flashcards: { orderBy: { createdAt: "asc" } },
      quizzes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!doc) notFound();

  const keyPoints = safeJSON<string[]>(doc.summary?.keyPoints, []);
  const glossary = safeJSON<{ term: string; definition: string }[]>(
    doc.summary?.glossary ?? null,
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href="/courses" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Cours
        </Link>
        <span>/</span>
        <span>{doc.chapter.course.title}</span>
        <span>/</span>
        <Link
          href={`/courses/${doc.chapter.course.id}/chapters/${doc.chapter.id}`}
          className="hover:text-foreground"
        >
          {doc.chapter.title}
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <FileText className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight break-words">{doc.name}</h1>
            <p className="text-muted-foreground text-sm">
              {doc.flashcards.length} flashcards · {doc.quizzes.length} quiz
              {doc.rawText ? ` · ${Math.round(doc.rawText.length / 1000)}k caractères extraits` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {doc.flashcards.length > 0 ? (
            <Button asChild>
              <Link href={`/study?documentId=${doc.id}`}>
                <Sparkles className="h-4 w-4" /> Réviser ce fichier
              </Link>
            </Button>
          ) : null}
          <GenerateDocumentButton documentId={doc.id} hasContent={!!doc.summary} />
          {doc.summary || doc.flashcards.length > 0 ? (
            <DeleteDocumentContentButton documentId={doc.id} />
          ) : null}
        </div>
      </div>

      {!doc.summary ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-3">
            <Sparkles className="h-10 w-10 mx-auto text-primary" />
            <h3 className="font-semibold">Pas encore généré</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Lance l&apos;IA pour produire le résumé, la fiche, les flashcards et les quiz à
              partir de ce fichier.
            </p>
            <GenerateDocumentButton documentId={doc.id} hasContent={false} />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Résumé</TabsTrigger>
            <TabsTrigger value="full">Fiche détaillée</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards ({doc.flashcards.length})</TabsTrigger>
            <TabsTrigger value="quiz">QCM & cas ({doc.quizzes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Résumé express</CardTitle>
                    <CardDescription>
                      Pour réviser en 1 minute. {doc.summary.edited ? "(modifié à la main)" : ""}
                    </CardDescription>
                  </div>
                  <EditSummaryButton
                    documentId={doc.id}
                    initial={{
                      short: doc.summary.short,
                      full: doc.summary.full,
                      keyPoints,
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base leading-relaxed">{doc.summary.short}</p>
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
                <Markdown>{doc.summary.full}</Markdown>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {doc.flashcards.length} carte{doc.flashcards.length > 1 ? "s" : ""} ·{" "}
                {doc.flashcards.filter((c) => c.custom).length} créée(s) à la main
              </p>
              <AddFlashcardButton documentId={doc.id} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {doc.flashcards.map((fc) => (
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
              {doc.quizzes.map((q) => {
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
                        <div className="mt-2">
                          <Markdown>{q.answer}</Markdown>
                        </div>
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
