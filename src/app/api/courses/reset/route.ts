import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Tout efface :
 * - les Reviews / StudySessions / DailyLogs (progression)
 * - les Summary / Flashcard / Quiz (contenu généré)
 * - les Documents / Chapters / Courses (cours importés)
 * Conserve : User, Account (auth), UserPreference (réglages).
 *
 * Permet de "repartir de zéro" et de réimporter depuis Drive.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Cascade : suppression des courses suffit, le reste suit via onDelete: Cascade.
  const [courses, reviews, sessions, logs] = await prisma.$transaction([
    prisma.course.deleteMany({ where: { userId: user.id } }),
    prisma.review.deleteMany({ where: { userId: user.id } }),
    prisma.studySession.deleteMany({ where: { userId: user.id } }),
    prisma.dailyLog.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log(
    `🧹 [reset-all] user=${user.id} courses=${courses.count} reviews=${reviews.count} sessions=${sessions.count} logs=${logs.count}`,
  );

  return NextResponse.json({
    ok: true,
    removed: {
      courses: courses.count,
      reviews: reviews.count,
      sessions: sessions.count,
      dailyLogs: logs.count,
    },
  });
}
