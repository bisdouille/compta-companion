import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sm2, ratingToQuality } from "@/lib/sm2";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    flashcardId: string;
    rating: "again" | "hard" | "good" | "easy";
    sessionId?: string;
  };

  const card = await prisma.flashcard.findFirst({
    where: { id: body.flashcardId, document: { chapter: { course: { userId: user.id } } } },
  });
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await prisma.review.findUnique({
    where: { userId_flashcardId: { userId: user.id, flashcardId: card.id } },
  });

  const quality = ratingToQuality(body.rating);
  const next = sm2(
    {
      ease: existing?.ease ?? 2.5,
      interval: existing?.interval ?? 0,
      repetitions: existing?.repetitions ?? 0,
      dueAt: existing?.dueAt ?? new Date(),
    },
    quality,
  );

  const saved = await prisma.review.upsert({
    where: { userId_flashcardId: { userId: user.id, flashcardId: card.id } },
    create: {
      userId: user.id,
      flashcardId: card.id,
      sessionId: body.sessionId,
      ease: next.ease,
      interval: next.interval,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      lastQuality: quality,
      lastReviewedAt: new Date(),
    },
    update: {
      sessionId: body.sessionId,
      ease: next.ease,
      interval: next.interval,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      lastQuality: quality,
      lastReviewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, dueAt: saved.dueAt, interval: saved.interval });
}
