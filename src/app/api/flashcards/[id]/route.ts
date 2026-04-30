import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedCard(userId: string, id: string) {
  return prisma.flashcard.findFirst({
    where: { id, chapter: { course: { userId } } },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const card = await getOwnedCard(user.id, params.id);
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json()) as {
    question?: string;
    answer?: string;
    hint?: string | null;
    difficulty?: "easy" | "medium" | "hard";
  };

  const updated = await prisma.flashcard.update({
    where: { id: card.id },
    data: {
      question: body.question?.trim() ?? card.question,
      answer: body.answer?.trim() ?? card.answer,
      hint: body.hint === undefined ? card.hint : body.hint?.trim() || null,
      difficulty: body.difficulty ?? card.difficulty,
      edited: true,
    },
  });

  return NextResponse.json({ ok: true, card: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const card = await getOwnedCard(user.id, params.id);
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.flashcard.delete({ where: { id: card.id } });
  return NextResponse.json({ ok: true });
}
