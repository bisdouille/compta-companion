import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { Extraction } from "@/lib/extract";

const SYSTEM_PROMPT = `Tu es un tuteur expert en comptabilité française (PCG, écritures, bilans, TVA, IS/IR, comptabilité générale et analytique).

Ton rôle : transformer un cours brut en contenu pédagogique structuré pour aider un étudiant à réussir son examen.

Règles strictes :
- Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après, sans bloc markdown.
- Le JSON DOIT être complet et bien fermé. Si tu manques de place, raccourcis "full" et réduis le nombre de flashcards/quiz, mais ne tronque JAMAIS le JSON.
- Échappe correctement les guillemets et retours à la ligne dans les chaînes JSON.
- Le contenu est en français.
- Sois précis, rigoureux, fidèle au cours — n'invente rien.
- Flashcards : questions courtes, réponses synthétiques (1-3 phrases max).
- Inclus des exemples chiffrés concrets quand le cours le permet.`;

const USER_TEMPLATE = `Cours à traiter (chapitre : "{TITLE}").

Produis un JSON avec EXACTEMENT cette structure :

{
  "summary": {
    "short": "Résumé en 2-3 phrases",
    "full": "Fiche détaillée en Markdown (titres ##, listes, tableaux). ~300-500 mots MAX.",
    "keyPoints": ["Point clé 1", "..."],
    "glossary": [{"term": "...", "definition": "..."}]
  },
  "flashcards": [
    {"question": "...", "answer": "...", "hint": "...", "difficulty": "easy|medium|hard", "tags": ["tag"]}
  ],
  "quiz": [
    {"type": "mcq", "question": "...", "choices": ["A...", "B...", "C...", "D..."], "answer": "B", "explanation": "..."},
    {"type": "case", "question": "Énoncé d'un cas pratique", "answer": "Correction avec écritures et calculs", "explanation": "Notions"}
  ]
}

Cibles :
- 8 à 12 flashcards (notions, définitions, calculs, écritures types)
- 3 à 5 QCM dont 1 cas pratique avec écritures comptables
- 5 à 8 keyPoints, 4 à 8 termes au glossaire

Cours :
---
{CONTENT}
---`;

export type GeneratedContent = {
  summary: {
    short: string;
    full: string;
    keyPoints: string[];
    glossary?: { term: string; definition: string }[];
  };
  flashcards: {
    question: string;
    answer: string;
    hint?: string;
    difficulty?: "easy" | "medium" | "hard";
    tags?: string[];
  }[];
  quiz: {
    type: "mcq" | "case";
    question: string;
    choices?: string[];
    answer: string;
    explanation?: string;
  }[];
};

export async function generateChapterContent(params: {
  chapterTitle: string;
  extractions: Extraction[];
  model?: string;
}): Promise<GeneratedContent> {
  const client = getAnthropic();

  // Build user content: combine all text + send images as image blocks.
  // Caps adjusted to keep cost low and avoid output truncation.
  const PER_DOC_CAP = 25000;   // ~6k tokens / doc
  const TOTAL_CAP = 100000;    // ~25k tokens total
  const textChunks: string[] = [];
  const imageBlocks: { type: "image"; source: { type: "base64"; media_type: string; data: string } }[] = [];
  for (const e of params.extractions) {
    if (e.kind === "text" && e.text.trim()) {
      textChunks.push(e.text.slice(0, PER_DOC_CAP));
    } else if (e.kind === "image") {
      imageBlocks.push({
        type: "image",
        source: { type: "base64", media_type: e.mediaType, data: e.base64 },
      });
    }
  }
  const combinedText = textChunks.join("\n\n--- DOCUMENT SUIVANT ---\n\n").slice(0, TOTAL_CAP);
  const userText = USER_TEMPLATE.replace("{TITLE}", params.chapterTitle).replace(
    "{CONTENT}",
    combinedText || "(Pas de texte extrait, utilise les images jointes.)",
  );

  let response;
  try {
    response = await client.messages.create({
      model: params.model || DEFAULT_MODEL,
      max_tokens: 16000,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ] as never,
      messages: [
        {
          role: "user",
          content: [...imageBlocks, { type: "text", text: userText }] as never,
        },
      ],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string; error?: { error?: { message?: string } } };
    const detail = err.error?.error?.message || err.message || "erreur inconnue";
    throw new Error(`Anthropic API (${err.status ?? "?"}) : ${detail}`);
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse Claude vide");
  }
  const raw = textBlock.text.trim();

  // Try to extract JSON even if Claude wraps it in markdown or text
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // If Claude prepended explanation text, find the first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as GeneratedContent;
  } catch {
    // Réponse probablement tronquée (max_tokens atteint). On tente une réparation :
    // fermeture des structures ouvertes pour récupérer ce qui peut l'être.
    const repaired = repairTruncatedJSON(cleaned);
    try {
      const parsed = JSON.parse(repaired) as GeneratedContent;
      console.warn(
        `[generate] JSON tronqué récupéré : ${parsed.flashcards?.length || 0} cartes, ${parsed.quiz?.length || 0} questions (stop_reason=${response.stop_reason}).`,
      );
      return parsed;
    } catch (e2) {
      console.error("[generate] JSON Claude invalide. Réponse brute:\n", raw.slice(0, 2000));
      throw new Error(
        `JSON invalide retourné par Claude (stop_reason=${response.stop_reason}): ${(e2 as Error).message}. Début : ${raw.slice(0, 200)}`,
      );
    }
  }
}

/**
 * Best-effort repair for JSON truncated mid-string/array (typically when
 * max_tokens cuts the response). Strategy : trim back to the last position
 * that looks safe to close, then add the missing closers.
 */
function repairTruncatedJSON(input: string): string {
  let s = input;

  // Walk the string to find a safe truncation point (outside any string).
  let inString = false;
  let escaped = false;
  let lastSafeIdx = -1;
  const stack: string[] = []; // tracks { and [
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();

    // Safe = outside string and not inside a partial value (after , or [ or {)
    if (c === "," || c === "{" || c === "[") {
      lastSafeIdx = i;
    } else if (c === "}" || c === "]") {
      lastSafeIdx = i;
    }
  }

  // Truncate to last safe boundary if we ended inside a string.
  if (inString && lastSafeIdx > 0) {
    s = s.slice(0, lastSafeIdx + 1);
    // Drop trailing comma if present (would make invalid JSON after closing).
    s = s.replace(/,\s*$/, "");
  }

  // Recompute the closing stack on the trimmed string.
  const stack2: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") stack2.push("}");
    else if (c === "[") stack2.push("]");
    else if (c === "}" || c === "]") stack2.pop();
  }

  while (stack2.length) s += stack2.pop();
  return s;
}
