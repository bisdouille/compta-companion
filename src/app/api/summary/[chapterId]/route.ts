import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { chapterId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const chapter = await prisma.chapter.findFirst({
    where: { id: params.chapterId, course: { userId: user.id } },
    include: { summary: true },
  });
  if (!chapter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json()) as {
    short?: string;
    full?: string;
    keyPoints?: string[];
    glossary?: { term: string; definition: string }[];
  };

  const data = {
    short: body.short ?? chapter.summary?.short ?? "",
    full: body.full ?? chapter.summary?.full ?? "",
    keyPoints: body.keyPoints
      ? JSON.stringify(body.keyPoints)
      : chapter.summary?.keyPoints ?? "[]",
    glossary: body.glossary
      ? JSON.stringify(body.glossary)
      : chapter.summary?.glossary ?? "[]",
    edited: true,
  };

  const summary = await prisma.summary.upsert({
    where: { chapterId: chapter.id },
    create: { chapterId: chapter.id, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, summary });
}
