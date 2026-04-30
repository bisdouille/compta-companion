/**
 * Extract a Google Drive folder ID from a URL or raw ID. Pure utility, no deps.
 *   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp
 *   https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMnOp?usp=sharing
 *   https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp
 */
export function extractFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (folderMatch) return folderMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idMatch) return idMatch[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}
