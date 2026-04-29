import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    dailyGoalMin?: number;
    dailyGoalCards?: number;
    examDate?: string;
    reminderTime?: string;
    preferredModel?: string;
  };

  const data = {
    dailyGoalMin: body.dailyGoalMin,
    dailyGoalCards: body.dailyGoalCards,
    examDate: body.examDate ? new Date(body.examDate) : null,
    reminderTime: body.reminderTime || null,
    preferredModel: body.preferredModel,
  };

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
}
