import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDriveClient, listChildren, isFolder } from "@/lib/drive";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId") || "root";

  const drive = await getDriveClient(user.id);
  if (!drive) return NextResponse.json({ error: "no_drive_token" }, { status: 400 });

  try {
    const children = await listChildren(drive, folderId);
    return NextResponse.json({
      folders: children.filter(isFolder).map((f) => ({ id: f.id, name: f.name })),
      files: children
        .filter((f) => !isFolder(f))
        .map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
    });
  } catch (e) {
    return NextResponse.json({ error: "drive_error", detail: (e as Error).message }, { status: 500 });
  }
}
