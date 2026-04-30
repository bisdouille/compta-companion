"use client";

import { useEffect, useState } from "react";

const QUOTES = [
  "Tu peux le faire.",
  "Tu vas y arriver.",
  "Un peu chaque jour, et le bilan se débrouille tout seul.",
  "La régularité bat l'intensité.",
  "Petit à petit, l'écriture comptable se débloque.",
  "Une carte à la fois.",
  "Ton futur toi te remerciera.",
  "Aucun effort n'est perdu.",
  "Le DCG ne se passera pas tout seul — mais toi, oui.",
  "Constance > perfection.",
  "Ce que tu révises aujourd'hui, tu le sauras demain.",
  "Chaque flashcard est une victoire.",
  "Tu es plus prêt que tu ne le crois.",
  "Allez, on s'y met.",
  "Le PCG t'attend, fais-lui de la place.",
];

export function MotivationalQuote() {
  // Choisi côté client après mount pour éviter mismatch SSR.
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <p className="text-sm italic text-muted-foreground" aria-live="polite">
      {quote ?? " "}
    </p>
  );
}
