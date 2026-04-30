import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Crée une flashcard custom attachée à un document. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    documentId: string;
    question: string;
    answer: string;
    hint?: string;
    difficulty?: "easy" | "medium" | "hard";
  };

  if (!body.documentId || !body.question?.trim() || !body.answer?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const doc = await prisma.document.findFirst({
    where: { id: body.documentId, chapter: { course: { userId: user.id } } },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const card = await prisma.flashcard.create({
    data: {
      documentId: doc.id,
      question: body.question.trim(),
      answer: body.answer.trim(),
      hint: body.hint?.trim() || null,
      difficulty: body.difficulty || "medium",
      custom: true,
      edited: false,
    },
  });

  return NextResponse.json({ ok: true, card });
}
