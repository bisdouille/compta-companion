import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  const session = await prisma.studySession.create({
    data: { userId: user.id, mode: body.mode || "flashcards" },
  });
  return NextResponse.json({ id: session.id });
}
