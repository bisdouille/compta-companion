import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDriveClient, downloadFile } from "@/lib/drive";
import { extractFromBuffer } from "@/lib/extract";
import { generateChapterContent } from "@/lib/generate";

export const maxDuration = 300;

/**
 * Génère (ou régénère) le contenu d'UN document : résumé, fiche, flashcards, quiz.
 * Body optionnel : { force?: boolean } — re-télécharger depuis Drive même si rawText existe.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let force = false;
  try {
    const body = (await req.json()) as { force?: boolean };
    force = !!body?.force;
  } catch {
    // pas de body
  }

  const doc = await prisma.document.findFirst({
    where: { id: params.id, chapter: { course: { userId: user.id } } },
    include: { chapter: { include: { course: true } } },
  });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });

  console.log(
    `\n🤖 [generate] ${doc.chapter.course.title} → ${doc.chapter.title} → ${doc.name}${force ? " (force)" : ""}`,
  );

  // Extraction (réutilise rawText si dispo, sauf force ou image).
  let extraction;
  try {
    if (!force && doc.rawText && !doc.mimeType.startsWith("image/")) {
      console.log(`   ♻️  Cache: ${doc.rawText.length} caractères`);
      extraction = { kind: "text" as const, text: doc.rawText };
    } else {
      const drive = await getDriveClient(user.id);
      if (!drive) return NextResponse.json({ error: "no_drive_token" }, { status: 400 });
      console.log(`   ⬇️  Téléchargement Drive: ${doc.mimeType}`);
      const buffer = await downloadFile(drive, doc.driveFileId, doc.mimeType);
      console.log(`   📄 Extraction: ${buffer.length} bytes`);
      extraction = await extractFromBuffer(buffer, doc.mimeType);
      if (extraction.kind === "text") {
        console.log(`   ✓ Texte: ${extraction.text.length} caractères`);
        await prisma.document.update({
          where: { id: doc.id },
          data: { rawText: extraction.text.slice(0, 200000) },
        });
      } else {
        console.log(`   ✓ Image: ${extraction.mediaType}`);
      }
    }
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`   ❌ Échec extraction: ${msg}`);
    return NextResponse.json(
      { error: "extraction_failed", detail: msg },
      { status: 500 },
    );
  }

  console.log(`   🧠 Appel Claude (${prefs?.preferredModel || "haiku-4.5"})...`);
  let content;
  try {
    content = await generateChapterContent({
      chapterTitle: `${doc.chapter.course.title} — ${doc.chapter.title} — ${doc.name}`,
      extractions: [extraction],
      model: prefs?.preferredModel,
    });
    console.log(
      `   ✓ Claude OK: ${content.flashcards?.length || 0} cartes, ${content.quiz?.length || 0} questions`,
    );
  } catch (e) {
    console.error(`   ❌ Erreur Claude:`, e);
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: "generation_failed", detail: msg },
      { status: 500 },
    );
  }

  // ---------- Persistance (toujours rattachée au document) ----------
  await prisma.summary.upsert({
    where: { documentId: doc.id },
    create: {
      documentId: doc.id,
      short: content.summary.short,
      full: content.summary.full,
      keyPoints: JSON.stringify(content.summary.keyPoints || []),
      glossary: JSON.stringify(content.summary.glossary || []),
    },
    update: {
      short: content.summary.short,
      full: content.summary.full,
      keyPoints: JSON.stringify(content.summary.keyPoints || []),
      glossary: JSON.stringify(content.summary.glossary || []),
      generatedAt: new Date(),
      edited: false,
    },
  });

  // Remplace les cartes générées par l'IA, garde les cartes custom.
  const existing = await prisma.flashcard.findMany({
    where: { documentId: doc.id, custom: false },
    include: { _count: { select: { reviews: true } } },
  });
  const safeToDelete = existing.filter((c) => c._count.reviews === 0).map((c) => c.id);
  if (safeToDelete.length) {
    await prisma.flashcard.deleteMany({ where: { id: { in: safeToDelete } } });
  }

  for (const fc of content.flashcards || []) {
    await prisma.flashcard.create({
      data: {
        documentId: doc.id,
        question: fc.question,
        answer: fc.answer,
        hint: fc.hint,
        difficulty: fc.difficulty || "medium",
        tags: JSON.stringify(fc.tags || []),
      },
    });
  }

  await prisma.quiz.deleteMany({ where: { documentId: doc.id } });
  for (const q of content.quiz || []) {
    await prisma.quiz.create({
      data: {
        documentId: doc.id,
        type: q.type,
        question: q.question,
        choices: q.choices ? JSON.stringify(q.choices) : null,
        answer: q.answer,
        explanation: q.explanation,
      },
    });
  }

  await prisma.document.update({
    where: { id: doc.id },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    flashcards: content.flashcards?.length || 0,
    quiz: content.quiz?.length || 0,
  });
}

/** Supprime tout le contenu généré pour ce document (résumé, cartes, quiz). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id: params.id, chapter: { course: { userId: user.id } } },
  });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.$transaction([
    prisma.summary.deleteMany({ where: { documentId: doc.id } }),
    prisma.flashcard.deleteMany({ where: { documentId: doc.id } }),
    prisma.quiz.deleteMany({ where: { documentId: doc.id } }),
    prisma.document.update({ where: { id: doc.id }, data: { processedAt: null } }),
  ]);

  return NextResponse.json({ ok: true });
}
