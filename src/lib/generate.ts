import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { Extraction } from "@/lib/extract";

const SYSTEM_PROMPT = `Tu es un tuteur expert en comptabilité française (PCG, écritures, bilans, TVA, IS/IR, comptabilité générale et analytique).

Ton rôle : transformer un cours brut (souvent un PDF ou des notes) en contenu pédagogique structuré pour aider un étudiant à réussir son examen.

Règles strictes :
- Réponds UNIQUEMENT en JSON valide, sans préambule ni texte autour.
- Le contenu est en français.
- Sois précis, rigoureux, et fidèle au cours fourni — n'invente pas de notions absentes du document.
- Si le document est trop court, génère moins d'éléments mais garde la qualité.
- Pour les flashcards : questions courtes et précises, réponses synthétiques (1-3 phrases max).
- Inclus des exemples chiffrés concrets quand le cours le permet.`;

const USER_TEMPLATE = `Voici le cours à traiter (titre du chapitre : "{TITLE}").

À partir de ce contenu, produis un JSON avec EXACTEMENT cette structure :

{
  "summary": {
    "short": "Résumé en 2-3 phrases du chapitre",
    "full": "Fiche détaillée en Markdown avec titres ##, listes, tableaux si pertinent. ~400-800 mots.",
    "keyPoints": ["Point clé 1", "Point clé 2", "..."],
    "glossary": [{"term": "...", "definition": "..."}]
  },
  "flashcards": [
    {"question": "...", "answer": "...", "hint": "...", "difficulty": "easy|medium|hard", "tags": ["tag1"]}
  ],
  "quiz": [
    {"type": "mcq", "question": "...", "choices": ["A...", "B...", "C...", "D..."], "answer": "B", "explanation": "..."},
    {"type": "case", "question": "Énoncé d'un cas pratique (ex: passer une écriture, calculer un résultat)", "answer": "Correction détaillée avec écritures comptables et calculs", "explanation": "Notions mobilisées"}
  ]
}

Vise environ :
- 12 à 20 flashcards bien réparties (notions, définitions, calculs, écritures types)
- 4 à 6 QCM dont 1-2 cas pratiques avec écritures comptables

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

  // Build user content: combine all text + send images as image blocks
  const textChunks: string[] = [];
  const imageBlocks: { type: "image"; source: { type: "base64"; media_type: string; data: string } }[] = [];
  for (const e of params.extractions) {
    if (e.kind === "text" && e.text.trim()) {
      textChunks.push(e.text.slice(0, 60000)); // hard cap per doc
    } else if (e.kind === "image") {
      imageBlocks.push({
        type: "image",
        source: { type: "base64", media_type: e.mediaType, data: e.base64 },
      });
    }
  }
  const combinedText = textChunks.join("\n\n--- DOCUMENT SUIVANT ---\n\n").slice(0, 180000);
  const userText = USER_TEMPLATE.replace("{TITLE}", params.chapterTitle).replace(
    "{CONTENT}",
    combinedText || "(Pas de texte extrait, utilise les images jointes.)",
  );

  const response = await client.messages.create({
    model: params.model || DEFAULT_MODEL,
    max_tokens: 8000,
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

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse Claude vide");
  }
  const raw = textBlock.text.trim();
  // Strip markdown fences if any
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: GeneratedContent;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("JSON invalide retourné par Claude: " + (e as Error).message);
  }

  return parsed;
}
