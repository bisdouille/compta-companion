import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDriveClient, downloadFile } from "@/lib/drive";
import { extractFromBuffer, type Extraction } from "@/lib/extract";
import { generateChapterContent } from "@/lib/generate";

export const maxDuration = 300; // seconds (Vercel pro / self-hosted)

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const chapter = await prisma.chapter.findFirst({
    where: { id: params.id, course: { userId: user.id } },
    include: { documents: true, course: true },
  });
  if (!chapter) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (chapter.documents.length === 0) {
    return NextResponse.json({ error: "no_documents" }, { status: 400 });
  }

  const drive = await getDriveClient(user.id);
  if (!drive) return NextResponse.json({ error: "no_drive_token" }, { status: 400 });

  const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });

  console.log(
    `\n🤖 [generate] ${chapter.course.title} → ${chapter.title} (${chapter.documents.length} doc(s))`,
  );

  const extractions: Extraction[] = [];
  const extractErrors: string[] = [];
  for (const doc of chapter.documents) {
    try {
      console.log(`   ⬇️  Téléchargement Drive: ${doc.name} (${doc.mimeType})`);
      const buffer = await downloadFile(drive, doc.driveFileId, doc.mimeType);
      console.log(`   📄 Extraction: ${doc.name} (${buffer.length} bytes)`);
      const ext = await extractFromBuffer(buffer, doc.mimeType);
      if (ext.kind === "text") {
        console.log(`   ✓ Texte extrait: ${ext.text.length} caractères`);
      } else {
        console.log(`   ✓ Image préparée: ${ext.mediaType}`);
      }
      extractions.push(ext);
      if (ext.kind === "text") {
        await prisma.document.update({
          where: { id: doc.id },
          data: { rawText: ext.text.slice(0, 200000), processedAt: new Date() },
        });
      } else {
        await prisma.document.update({
          where: { id: doc.id },
          data: { processedAt: new Date() },
        });
      }
    } catch (e) {
      const msg = (e as Error).message;
      console.error(`   ❌ Échec ${doc.name}: ${msg}`);
      extractErrors.push(`${doc.name}: ${msg}`);
    }
  }

  if (extractions.length === 0) {
    return NextResponse.json(
      {
        error: "extraction_failed",
        detail: `Aucun document n'a pu être extrait. Erreurs : ${extractErrors.join(" | ")}`,
      },
      { status: 500 },
    );
  }

  console.log(`   🧠 Appel Claude (${prefs?.preferredModel || "claude-sonnet-4-6"})...`);
  let content;
  try {
    content = await generateChapterContent({
      chapterTitle: `${chapter.course.title} — ${chapter.title}`,
      extractions,
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

  // Persist
  await prisma.summary.upsert({
    where: { chapterId: chapter.id },
    create: {
      chapterId: chapter.id,
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

  // Replace flashcards & quiz (keep existing reviews if same content? simpler: only delete cards without reviews)
  const existingCards = await prisma.flashcard.findMany({
    where: { chapterId: chapter.id },
    include: { _count: { select: { reviews: true } } },
  });
  const safeToDelete = existingCards.filter((c) => c._count.reviews === 0).map((c) => c.id);
  if (safeToDelete.length) {
    await prisma.flashcard.deleteMany({ where: { id: { in: safeToDelete } } });
  }

  for (const fc of content.flashcards || []) {
    await prisma.flashcard.create({
      data: {
        chapterId: chapter.id,
        question: fc.question,
        answer: fc.answer,
        hint: fc.hint,
        difficulty: fc.difficulty || "medium",
        tags: JSON.stringify(fc.tags || []),
      },
    });
  }

  await prisma.quiz.deleteMany({ where: { chapterId: chapter.id } });
  for (const q of content.quiz || []) {
    await prisma.quiz.create({
      data: {
        chapterId: chapter.id,
        type: q.type,
        question: q.question,
        choices: q.choices ? JSON.stringify(q.choices) : null,
        answer: q.answer,
        explanation: q.explanation,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    flashcards: content.flashcards.length,
    quiz: content.quiz.length,
  });
}
