import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Réinitialise la progression de révision : supprime tous les Reviews,
 * StudySessions, et DailyLogs de l'utilisateur. Ne touche PAS au contenu
 * (cours / chapitres / flashcards / résumés).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [reviews, sessions, logs] = await prisma.$transaction([
    prisma.review.deleteMany({ where: { userId: user.id } }),
    prisma.studySession.deleteMany({ where: { userId: user.id } }),
    prisma.dailyLog.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log(
    `🧹 [reset] user=${user.id} reviews=${reviews.count} sessions=${sessions.count} logs=${logs.count}`,
  );

  return NextResponse.json({
    ok: true,
    removed: { reviews: reviews.count, sessions: sessions.count, dailyLogs: logs.count },
  });
}
