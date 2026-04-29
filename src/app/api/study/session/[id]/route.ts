import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    finalize?: boolean;
    durationSec?: number;
    cardsSeen?: number;
    cardsRight?: number;
    cardsWrong?: number;
  };

  const session = await prisma.studySession.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await prisma.studySession.update({
    where: { id: session.id },
    data: {
      durationSec: body.durationSec ?? session.durationSec,
      cardsSeen: body.cardsSeen ?? session.cardsSeen,
      cardsRight: body.cardsRight ?? session.cardsRight,
      cardsWrong: body.cardsWrong ?? session.cardsWrong,
      endedAt: body.finalize ? new Date() : session.endedAt,
    },
  });

  if (body.finalize) {
    // upsert daily log
    const date = todayKey();
    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });
    const goalMin = prefs?.dailyGoalMin ?? 15;
    const minutesAdded = Math.round((updated.durationSec || 0) / 60);
    await prisma.dailyLog.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: {
        userId: user.id,
        date,
        minutes: minutesAdded,
        cardsSeen: updated.cardsSeen,
        cardsRight: updated.cardsRight,
        cardsWrong: updated.cardsWrong,
        goalMet: minutesAdded >= goalMin,
      },
      update: {
        minutes: { increment: minutesAdded },
        cardsSeen: { increment: updated.cardsSeen },
        cardsRight: { increment: updated.cardsRight },
        cardsWrong: { increment: updated.cardsWrong },
      },
    });
    const updatedLog = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });
    if (updatedLog && updatedLog.minutes >= goalMin && !updatedLog.goalMet) {
      await prisma.dailyLog.update({
        where: { id: updatedLog.id },
        data: { goalMet: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
