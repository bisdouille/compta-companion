"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GenerateButton({
  chapterId,
  hasContent,
}: {
  chapterId: string;
  hasContent: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Échec");
      toast.success(`Généré : ${data.flashcards} cartes, ${data.quiz} questions`);
      router.refresh();
    } catch (e) {
      toast.error("Erreur de génération : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={run} disabled={loading} variant={hasContent ? "outline" : "default"}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : hasContent ? (
        <RefreshCcw className="h-4 w-4" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {hasContent ? "Régénérer" : "Générer avec l'IA"}
    </Button>
  );
}
