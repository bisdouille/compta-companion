import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDriveClient, buildTree, type DriveTree } from "@/lib/drive";
import { prisma } from "@/lib/prisma";

/**
 * Body: { folderId: string, courseTitle?: string, courseId?: string }
 *
 * Convention :
 * - Chaque sous-dossier de niveau 1 = un cours
 * - Chaque sous-dossier de niveau 2 = un chapitre
 * - Si seulement des fichiers à la racine du dossier choisi : un seul chapitre "Général"
 * - Si pas de sous-sous-dossier : chaque sous-dossier devient un chapitre du cours unique
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { folderId?: string; courseTitle?: string };

  let folderId = body.folderId;
  if (!folderId) {
    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });
    folderId = prefs?.driveRootFolder ?? undefined;
  }
  if (!folderId) return NextResponse.json({ error: "missing_folderId" }, { status: 400 });

  const drive = await getDriveClient(user.id);
  if (!drive) return NextResponse.json({ error: "no_drive_token" }, { status: 400 });

  // Save root folder in prefs
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, driveRootFolder: folderId },
    update: { driveRootFolder: folderId },
  });

  const tree = await buildTree(drive, folderId, body.courseTitle || "Mes cours");

  const courses: { courseId: string; chapters: number; documents: number }[] = [];

  // Strategy A: tree has subfolders → each subfolder = course; its subfolders = chapters
  if (tree.subfolders.length > 0) {
    for (const courseNode of tree.subfolders) {
      const existing = await prisma.course.findFirst({
        where: { userId: user.id, driveFolderId: courseNode.id },
      });
      const course = existing
        ? await prisma.course.update({
            where: { id: existing.id },
            data: { title: courseNode.name },
          })
        : await prisma.course.create({
            data: { userId: user.id, title: courseNode.name, driveFolderId: courseNode.id },
          });

      // Chapters
      let chaptersCount = 0;
      let documentsCount = 0;

      const chapterNodes: DriveTree[] =
        courseNode.subfolders.length > 0
          ? courseNode.subfolders
          : [{ id: courseNode.id, name: "Général", documents: courseNode.documents, subfolders: [] }];

      for (const chapNode of chapterNodes) {
        const chapter = await upsertChapter(course.id, chapNode.id, chapNode.name);
        chaptersCount++;
        // Sync documents in chapter (collect from chapter and its subfolders, flat)
        const allDocs = collectDocs(chapNode);
        for (const doc of allDocs) {
          await upsertDocument(chapter.id, doc);
          documentsCount++;
        }
      }
      courses.push({ courseId: course.id, chapters: chaptersCount, documents: documentsCount });
    }
  } else {
    // Strategy B: only files in the chosen folder → one course, one chapter
    const courseTitle = body.courseTitle || tree.name;
    const existing = await prisma.course.findFirst({
      where: { userId: user.id, driveFolderId: tree.id },
    });
    const course = existing
      ? await prisma.course.update({
          where: { id: existing.id },
          data: { title: courseTitle },
        })
      : await prisma.course.create({
          data: { userId: user.id, title: courseTitle, driveFolderId: tree.id },
        });

    const chapter = await upsertChapter(course.id, tree.id, "Général");
    let documentsCount = 0;
    for (const doc of tree.documents) {
      await upsertDocument(chapter.id, doc);
      documentsCount++;
    }
    courses.push({ courseId: course.id, chapters: 1, documents: documentsCount });
  }

  return NextResponse.json({ ok: true, courses });
}

async function upsertChapter(courseId: string, driveFolderId: string, title: string) {
  const existing = await prisma.chapter.findFirst({
    where: { courseId, driveFolderId },
  });
  if (existing) {
    return prisma.chapter.update({
      where: { id: existing.id },
      data: { title },
    });
  }
  return prisma.chapter.create({
    data: { courseId, driveFolderId, title },
  });
}

async function upsertDocument(
  chapterId: string,
  doc: { id: string; name: string; mimeType: string; modifiedTime?: string | null },
) {
  return prisma.document.upsert({
    where: { driveFileId: doc.id },
    create: {
      chapterId,
      driveFileId: doc.id,
      name: doc.name,
      mimeType: doc.mimeType,
      modifiedTime: doc.modifiedTime ? new Date(doc.modifiedTime) : null,
    },
    update: {
      chapterId,
      name: doc.name,
      mimeType: doc.mimeType,
      modifiedTime: doc.modifiedTime ? new Date(doc.modifiedTime) : null,
    },
  });
}

function collectDocs(node: DriveTree): { id: string; name: string; mimeType: string; modifiedTime?: string | null }[] {
  const out = [...node.documents];
  for (const sub of node.subfolders) out.push(...collectDocs(sub));
  return out;
}
