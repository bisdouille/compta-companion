"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerateDocumentButton({
  documentId,
  hasContent,
}: {
  documentId: string;
  hasContent: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (
      hasContent &&
      !window.confirm(
        "Régénérer ce fichier ? Les flashcards déjà révisées sont conservées, les autres sont remplacées.",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Échec");
      toast.success(`Généré : ${data.flashcards} cartes, ${data.quiz} quiz`);
      router.refresh();
    } catch (e) {
      toast.error("Erreur : " + (e as Error).message);
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

export function DeleteDocumentContentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (
      !window.confirm(
        "Supprimer le résumé, la fiche, les flashcards et les quiz de ce fichier ? Les sessions de révision déjà faites sont conservées.",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/generate`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Contenu supprimé");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={run} disabled={loading} variant="ghost" size="sm">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Supprimer le contenu
    </Button>
  );
}
