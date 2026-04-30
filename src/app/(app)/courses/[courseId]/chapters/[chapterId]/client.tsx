"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCcw, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Doc = { id: string; name: string; rawText: string | null };

/**
 * Bouton compact pour générer/régénérer 1 seul fichier sans toucher aux autres.
 * Utilisé dans la liste des documents.
 */
export function GenerateOneFile({
  chapterId,
  documentId,
  processed,
}: {
  chapterId: string;
  documentId: string;
  processed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (processed && !window.confirm("Ce fichier a déjà été traité. Régénérer ses cartes ?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: [documentId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Échec");
      toast.success(`Fichier traité : ${data.flashcards} cartes, ${data.quiz} quiz`);
      router.refresh();
    } catch (e) {
      toast.error("Erreur : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={run}
      disabled={loading}
      size="sm"
      variant={processed ? "outline" : "default"}
      className="shrink-0"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : processed ? (
        <RefreshCcw className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {processed ? "Régénérer" : "Générer"}
    </Button>
  );
}

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
      const res = await fetch(`/api/chapters/${chapterId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
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
      {hasContent ? "Régénérer (tout)" : "Générer (tout)"}
    </Button>
  );
}

/**
 * Sélection granulaire : permet de générer à partir d'1 ou plusieurs fichiers
 * choisis. Pratique pour tester sur un petit doc avant de cramer des tokens
 * sur tout le chapitre.
 */
export function GenerateFromSelection({
  chapterId,
  documents,
}: {
  chapterId: string;
  documents: Doc[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(documents.map((d) => d.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function run() {
    if (selected.size === 0) {
      toast.error("Sélectionne au moins un fichier");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Échec");
      toast.success(`Généré depuis ${selected.size} fichier(s) : ${data.flashcards} cartes, ${data.quiz} questions`);
      router.refresh();
    } catch (e) {
      toast.error("Erreur : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Choisis les fichiers à utiliser pour cette génération.
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Tout
          </button>
          <span className="text-muted-foreground text-xs">·</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-xs text-muted-foreground hover:underline"
          >
            Aucun
          </button>
        </div>
      </div>
      <ul className="divide-y rounded-lg border">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-2 p-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(d.id)}
              onChange={() => toggle(d.id)}
              className="h-4 w-4"
              id={`doc-${d.id}`}
            />
            <label
              htmlFor={`doc-${d.id}`}
              className="flex-1 flex items-center gap-2 cursor-pointer truncate"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{d.name}</span>
              {d.rawText ? (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {Math.round(d.rawText.length / 1000)}k
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground shrink-0">non extrait</span>
              )}
            </label>
          </li>
        ))}
      </ul>
      <Button onClick={run} disabled={loading || selected.size === 0} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Générer depuis {selected.size || "—"} fichier{selected.size > 1 ? "s" : ""}
      </Button>
    </div>
  );
}
