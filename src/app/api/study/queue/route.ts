import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Build the study queue.
 * Query params:
 *   - chapterId : limit to a chapter
 *   - courseId : limit to a course
 *   - limit (default 30)
 *   - mode : "due" | "quick5" | "all"
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const chapterId = url.searchParams.get("chapterId");
  const courseId = url.searchParams.get("courseId");
  const mode = url.searchParams.get("mode") || "due";
  const limit = Math.min(100, Number(url.searchParams.get("limit") || (mode === "quick5" ? 8 : 30)));

  const cardWhere: Record<string, unknown> = { chapter: { course: { userId: user.id } } };
  if (chapterId) cardWhere.chapterId = chapterId;
  if (courseId) (cardWhere.chapter as Record<string, unknown>) = { courseId, course: { userId: user.id } };

  // Fetch all candidate cards with their review (if any) for this user
  const cards = await prisma.flashcard.findMany({
    where: cardWhere as never,
    include: {
      chapter: { include: { course: true } },
      reviews: { where: { userId: user.id }, take: 1 },
    },
  });

  const now = new Date();

  // Score each card for ordering
  type Scored = { card: (typeof cards)[number]; score: number; isDue: boolean; isNew: boolean };
  const scored: Scored[] = cards.map((c) => {
    const r = c.reviews[0];
    const isNew = !r;
    const isDue = !r || r.dueAt <= now;
    let score = 0;
    if (r) {
      const overdueDays = Math.max(0, (now.getTime() - r.dueAt.getTime()) / 86400000);
      score += overdueDays * 10;
      score += (3 - r.ease) * 5; // harder = higher priority
      if ((r.lastQuality ?? 5) < 3) score += 20; // recently failed
    } else {
      score += 5; // new card
    }
    return { card: c, score, isDue, isNew };
  });

  let pool: Scored[];
  if (mode === "quick5") {
    pool = scored.filter((s) => s.isDue || s.isNew);
    // urgent first, then top scores
    pool.sort((a, b) => b.score - a.score);
  } else if (mode === "all") {
    pool = scored.sort((a, b) => b.score - a.score);
  } else {
    pool = scored.filter((s) => s.isDue).sort((a, b) => b.score - a.score);
    if (pool.length < limit) {
      // top up with new cards
      const fresh = scored.filter((s) => s.isNew && !pool.includes(s));
      pool.push(...fresh.slice(0, limit - pool.length));
    }
  }

  const out = pool.slice(0, limit).map(({ card }) => ({
    id: card.id,
    question: card.question,
    answer: card.answer,
    hint: card.hint,
    difficulty: card.difficulty,
    chapter: { id: card.chapter.id, title: card.chapter.title },
    course: { id: card.chapter.course.id, title: card.chapter.course.title },
    review: card.reviews[0]
      ? {
          ease: card.reviews[0].ease,
          interval: card.reviews[0].interval,
          repetitions: card.reviews[0].repetitions,
          dueAt: card.reviews[0].dueAt,
        }
      : null,
  }));

  return NextResponse.json({ cards: out });
}
