import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id: params.id, chapter: { course: { userId: user.id } } },
    include: { summary: true },
  });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json()) as {
    short?: string;
    full?: string;
    keyPoints?: string[];
    glossary?: { term: string; definition: string }[];
  };

  const data = {
    short: body.short ?? doc.summary?.short ?? "",
    full: body.full ?? doc.summary?.full ?? "",
    keyPoints: body.keyPoints
      ? JSON.stringify(body.keyPoints)
      : doc.summary?.keyPoints ?? "[]",
    glossary: body.glossary
      ? JSON.stringify(body.glossary)
      : doc.summary?.glossary ?? "[]",
    edited: true,
  };

  const summary = await prisma.summary.upsert({
    where: { documentId: doc.id },
    create: { documentId: doc.id, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, summary });
}
