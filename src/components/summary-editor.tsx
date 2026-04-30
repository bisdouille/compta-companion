"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function EditSummaryButton({
  chapterId,
  initial,
}: {
  chapterId: string;
  initial: { short: string; full: string; keyPoints: string[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState({
    short: initial.short,
    full: initial.full,
    keyPointsText: initial.keyPoints.join("\n"),
  });

  async function save() {
    setSaving(true);
    try {
      const keyPoints = v.keyPointsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/summary/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short: v.short, full: v.full, keyPoints }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Résumé enregistré");
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
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le résumé du chapitre</DialogTitle>
          <DialogDescription>
            Modifications conservées. La fiche détaillée accepte le Markdown (## titres, **gras**,
            listes, tableaux).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="short">Résumé court (TL;DR)</Label>
            <Textarea
              id="short"
              rows={3}
              value={v.short}
              onChange={(e) => setV({ ...v, short: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kp">Points clés (un par ligne)</Label>
            <Textarea
              id="kp"
              rows={5}
              value={v.keyPointsText}
              onChange={(e) => setV({ ...v, keyPointsText: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full">Fiche détaillée (Markdown)</Label>
            <Textarea
              id="full"
              rows={16}
              value={v.full}
              onChange={(e) => setV({ ...v, full: e.target.value })}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
