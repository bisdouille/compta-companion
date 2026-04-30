import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function getDashboardData(userId: string) {
  const [prefs, dailyLogs, dueCount, totalCards, totalCourses, recentSessions] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.review.count({
      where: { userId, dueAt: { lte: new Date() } },
    }),
    prisma.flashcard.count({
      where: { document: { chapter: { course: { userId } } } },
    }),
    prisma.course.count({ where: { userId } }),
    prisma.studySession.findMany({
      where: { userId, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const today = todayKey();
  const todayLog = dailyLogs.find((l) => l.date === today);

  // Streak: walk backwards from today while goalMet (or any activity if no goal)
  const goalMin = prefs?.dailyGoalMin ?? 15;
  const logSet = new Map(dailyLogs.map((l) => [l.date, l]));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (;;) {
    const k = todayKey(cursor);
    const l = logSet.get(k);
    const met = !!l && l.minutes >= goalMin;
    if (met) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (k === today && (!l || l.minutes === 0)) {
      // today not yet done — check yesterday
      cursor.setDate(cursor.getDate() - 1);
      const k2 = todayKey(cursor);
      const l2 = logSet.get(k2);
      if (l2 && l2.minutes >= goalMin) {
        // streak continues from yesterday but without counting today
        // we'll count from yesterday onward
        continue;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  const last30 = dailyLogs.slice(0, 30);
  const totalMinutes30 = last30.reduce((a, b) => a + b.minutes, 0);
  const totalCards30 = last30.reduce((a, b) => a + b.cardsSeen, 0);
  const accuracy30 = (() => {
    const seen = last30.reduce((a, b) => a + b.cardsSeen, 0);
    const right = last30.reduce((a, b) => a + b.cardsRight, 0);
    return seen ? Math.round((right / seen) * 100) : 0;
  })();

  return {
    prefs,
    today: todayLog,
    streak,
    dueCount,
    totalCards,
    totalCourses,
    dailyLogs,
    totalMinutes30,
    totalCards30,
    accuracy30,
    recentSessions,
  };
}
