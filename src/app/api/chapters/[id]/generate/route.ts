import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDriveClient, downloadFile } from "@/lib/drive";
import { extractFromBuffer, type Extraction } from "@/lib/extract";
import { generateChapterContent } from "@/lib/generate";

export const maxDuration = 300; // seconds (Vercel pro / self-hosted)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Body optionnel : { documentIds?: string[], force?: boolean }
  // - documentIds : ne traiter que ces documents (sinon tous)
  // - force : ignorer le cache rawText et re-télécharger depuis Drive
  let documentIds: string[] | undefined;
  let force = false;
  try {
    const body = (await req.json()) as { documentIds?: string[]; force?: boolean };
    documentIds = body?.documentIds;
    force = !!body?.force;
  } catch {
    // pas de body, OK
  }

  const chapter = await prisma.chapter.findFirst({
    where: { id: params.id, course: { userId: user.id } },
    include: { documents: true, course: true, summary: true },
  });
  if (!chapter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const docs = documentIds && documentIds.length > 0
    ? chapter.documents.filter((d) => documentIds!.includes(d.id))
    : chapter.documents;
  if (docs.length === 0) {
    return NextResponse.json({ error: "no_documents" }, { status: 400 });
  }

  const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });

  console.log(
    `\n🤖 [generate] ${chapter.course.title} → ${chapter.title} (${docs.length}/${chapter.documents.length} doc(s)${force ? ", force" : ""})`,
  );

  // Drive client n'est nécessaire que si on doit (re)télécharger au moins un doc.
  const needsDrive = force || docs.some((d) => !d.rawText || d.mimeType.startsWith("image/"));
  const drive = needsDrive ? await getDriveClient(user.id) : null;
  if (needsDrive && !drive) {
    return NextResponse.json({ error: "no_drive_token" }, { status: 400 });
  }

  const extractions: Extraction[] = [];
  const extractErrors: string[] = [];
  for (const doc of docs) {
    try {
      // Réutilise le texte déjà extrait si dispo (évite re-DL Drive + re-parse PDF).
      if (!force && doc.rawText && !doc.mimeType.startsWith("image/")) {
        console.log(`   ♻️  Cache: ${doc.name} (${doc.rawText.length} caractères)`);
        extractions.push({ kind: "text", text: doc.rawText });
        continue;
      }
      console.log(`   ⬇️  Téléchargement Drive: ${doc.name} (${doc.mimeType})`);
      const buffer = await downloadFile(drive!, doc.driveFileId, doc.mimeType);
      console.log(`   📄 Extraction: ${doc.name} (${buffer.length} bytes)`);
      const ext = await extractFromBuffer(buffer, doc.mimeType);
      if (ext.kind === "text") {
        console.log(`   ✓ Texte extrait: ${ext.text.length} caractères`);
        await prisma.document.update({
          where: { id: doc.id },
          data: { rawText: ext.text.slice(0, 200000), processedAt: new Date() },
        });
      } else {
        console.log(`   ✓ Image préparée: ${ext.mediaType}`);
        await prisma.document.update({
          where: { id: doc.id },
          data: { processedAt: new Date() },
        });
      }
      extractions.push(ext);
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

  console.log(`   🧠 Appel Claude (${prefs?.preferredModel || "haiku-4.5"})...`);
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

  // ---------- Persistance ----------
  // Mode "single-file" : on tague tout ce qui est créé avec le documentId, et on ne
  // remplace QUE les éléments précédemment générés depuis ce même fichier.
  // Mode "multi/all" : régénération du chapitre — on remplace les éléments
  // chapitre-level (documentId null) en gardant les cartes custom et les cartes
  // d'autres fichiers.
  const singleFileMode = docs.length === 1;
  const targetDocId = singleFileMode ? docs[0].id : null;

  // Résumé : créé s'il n'existe pas, ou mis à jour seulement en mode multi/all
  // (sinon générer 1 fichier écraserait la synthèse chapitre).
  if (!singleFileMode || !chapter.summary) {
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
  }

  // Suppression sélective des anciennes cartes/quiz à régénérer.
  // - single-file : uniquement celles taguées avec ce documentId
  // - multi/all : celles sans documentId OU dont le doc fait partie du batch,
  //               à l'exclusion des cards custom et de celles avec reviews.
  const existingCards = await prisma.flashcard.findMany({
    where: singleFileMode
      ? { chapterId: chapter.id, documentId: targetDocId }
      : {
          chapterId: chapter.id,
          custom: false,
          OR: [{ documentId: null }, { documentId: { in: docs.map((d) => d.id) } }],
        },
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
        documentId: targetDocId,
        question: fc.question,
        answer: fc.answer,
        hint: fc.hint,
        difficulty: fc.difficulty || "medium",
        tags: JSON.stringify(fc.tags || []),
      },
    });
  }

  await prisma.quiz.deleteMany({
    where: singleFileMode
      ? { chapterId: chapter.id, documentId: targetDocId }
      : {
          chapterId: chapter.id,
          OR: [{ documentId: null }, { documentId: { in: docs.map((d) => d.id) } }],
        },
  });
  for (const q of content.quiz || []) {
    await prisma.quiz.create({
      data: {
        chapterId: chapter.id,
        documentId: targetDocId,
        type: q.type,
        question: q.question,
        choices: q.choices ? JSON.stringify(q.choices) : null,
        answer: q.answer,
        explanation: q.explanation,
      },
    });
  }

  // Marque les docs traités (utile pour l'UI "non traité / traité").
  await prisma.document.updateMany({
    where: { id: { in: docs.map((d) => d.id) } },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    flashcards: content.flashcards.length,
    quiz: content.quiz.length,
  });
}
