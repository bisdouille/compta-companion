/**
 * Extract textual content from a Drive file buffer.
 * - PDF: pdf-parse
 * - Google Docs (already exported as text/plain)
 * - Images: returned as base64 to be sent to Claude vision
 */
export type Extraction =
  | { kind: "text"; text: string }
  | { kind: "image"; base64: string; mediaType: string };

export async function extractFromBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<Extraction> {
  if (mimeType === "application/pdf") {
    // pdf-parse has a quirk: importing the package index triggers debug code
    // that tries to read a test fixture. Import the inner module to skip it.
    // @ts-expect-error inner module has no types
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = mod.default as (b: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return { kind: "text", text: data.text || "" };
  }
  if (mimeType === "application/vnd.google-apps.document" || mimeType.startsWith("text/")) {
    return { kind: "text", text: buffer.toString("utf-8") };
  }
  if (mimeType.startsWith("image/")) {
    return { kind: "image", base64: buffer.toString("base64"), mediaType: mimeType };
  }
  return { kind: "text", text: "" };
}
