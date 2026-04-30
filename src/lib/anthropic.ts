import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY manquante. Ajoute-la dans .env.local");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Haiku 4.5 par défaut : ~3x moins cher que Sonnet, suffisant pour de la
// génération JSON structurée à partir d'un cours déjà extrait en texte.
export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
