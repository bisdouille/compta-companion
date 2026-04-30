"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Difficulty = "easy" | "medium" | "hard";

type FlashcardLike = {
  id: string;
  question: string;
  answer: string;
  hint?: string | null;
  difficulty: string;
};

function FlashcardForm({
  initial,
  onSubmit,
  saving,
}: {
  initial: { question: string; answer: string; hint: string; difficulty: Difficulty };
  onSubmit: (v: { question: string; answer: string; hint: string; difficulty: Difficulty }) => void;
  saving: boolean;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="q">Question</Label>
        <Textarea
          id="q"
          value={v.question}
          onChange={(e) => setV({ ...v, question: e.target.value })}
          rows={2}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="a">Réponse</Label>
        <Textarea
          id="a"
          value={v.answer}
          onChange={(e) => setV({ ...v, answer: e.target.value })}
          rows={4}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="h">Indice (optionnel)</Label>
        <Input
          id="h"
          value={v.hint}
          onChange={(e) => setV({ ...v, hint: e.target.value })}
          placeholder="Petit coup de pouce sans donner la réponse"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d">Difficulté</Label>
        <select
          id="d"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={v.difficulty}
          onChange={(e) => setV({ ...v, difficulty: e.target.value as Difficulty })}
        >
          <option value="easy">Facile</option>
          <option value="medium">Moyen</option>
          <option value="hard">Difficile</option>
        </select>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(v)} disabled={saving || !v.question.trim() || !v.answer.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </DialogFooter>
    </div>
  );
}

export function AddFlashcardButton({ chapterId }: { chapterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(v: { question: string; answer: string; hint: string; difficulty: Difficulty }) {
    setSaving(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, ...v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Carte ajoutée");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Ajouter une carte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle flashcard</DialogTitle>
          <DialogDescription>
            Carte personnelle, ajoutée au chapitre. Conservée même lors d&apos;une régénération.
          </DialogDescription>
        </DialogHeader>
        <FlashcardForm
          initial={{ question: "", answer: "", hint: "", difficulty: "medium" }}
          onSubmit={submit}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditFlashcardButton({ card }: { card: FlashcardLike }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(v: { question: string; answer: string; hint: string; difficulty: Difficulty }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/flashcards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: v.question,
          answer: v.answer,
          hint: v.hint || null,
          difficulty: v.difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Carte modifiée");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la flashcard</DialogTitle>
        </DialogHeader>
        <FlashcardForm
          initial={{
            question: card.question,
            answer: card.answer,
            hint: card.hint || "",
            difficulty: (card.difficulty as Difficulty) || "medium",
          }}
          onSubmit={submit}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFlashcardButton({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!window.confirm("Supprimer cette carte ?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/flashcards/${cardId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Carte supprimée");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={del} disabled={busy} size="sm" variant="ghost" className="h-7 w-7 p-0">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
