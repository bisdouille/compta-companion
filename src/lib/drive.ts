import { google, drive_v3 } from "googleapis";
import { getGoogleAccessToken } from "@/lib/auth";

const SUPPORTED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/vnd.google-apps.document",
];

export async function getDriveClient(userId: string): Promise<drive_v3.Drive | null> {
  const token = await getGoogleAccessToken(userId);
  if (!token) return null;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return google.drive({ version: "v3", auth });
}

export async function listChildren(drive: drive_v3.Drive, folderId: string) {
  const all: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, parents, size, iconLink)",
      pageSize: 200,
      orderBy: "name",
      pageToken,
    });
    all.push(...(res.data.files ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return all;
}

export function isFolder(f: drive_v3.Schema$File) {
  return f.mimeType === "application/vnd.google-apps.folder";
}

export function isSupportedDocument(f: drive_v3.Schema$File) {
  return f.mimeType ? SUPPORTED_MIME.includes(f.mimeType) : false;
}

export async function downloadFile(
  drive: drive_v3.Drive,
  fileId: string,
  mimeType: string,
): Promise<Buffer> {
  if (mimeType === "application/vnd.google-apps.document") {
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(res.data as ArrayBuffer);
  }
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export type DriveTree = {
  id: string;
  name: string;
  documents: { id: string; name: string; mimeType: string; modifiedTime?: string | null }[];
  subfolders: DriveTree[];
};

export async function buildTree(
  drive: drive_v3.Drive,
  folderId: string,
  name = "racine",
  depth = 0,
): Promise<DriveTree> {
  if (depth > 4) return { id: folderId, name, documents: [], subfolders: [] };
  const children = await listChildren(drive, folderId);
  const docs = children.filter(isSupportedDocument).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    modifiedTime: f.modifiedTime,
  }));
  const folders = children.filter(isFolder);
  const subfolders: DriveTree[] = [];
  for (const f of folders) {
    subfolders.push(await buildTree(drive, f.id!, f.name!, depth + 1));
  }
  return { id: folderId, name, documents: docs, subfolders };
}
