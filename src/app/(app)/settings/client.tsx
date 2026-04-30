"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, FolderSync, Link2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractFolderId } from "@/lib/drive-url";

export function DriveSettings({ currentFolderId }: { currentFolderId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(
    currentFolderId ? `https://drive.google.com/drive/folders/${currentFolderId}` : "",
  );
  const [busy, setBusy] = useState(false);

  async function importNow(reSync = false) {
    const id = extractFolderId(url);
    if (!id) {
      toast.error("URL Drive invalide");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(reSync ? "Drive synchronisé" : "Dossier importé");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="driveUrl" className="flex items-center gap-1">
          <Link2 className="h-3 w-3" /> URL du dossier Drive
        </Label>
        <Input
          id="driveUrl"
          placeholder="https://drive.google.com/drive/folders/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Ouvre ton dossier sur Drive et copie l&apos;URL depuis la barre d&apos;adresse.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => importNow(false)} disabled={busy || !url}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {currentFolderId ? "Changer de dossier" : "Importer"}
        </Button>
        {currentFolderId ? (
          <Button variant="outline" onClick={() => importNow(true)} disabled={busy}>
            <FolderSync className="h-4 w-4" /> Re-synchroniser maintenant
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function WipeAllCoursesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (
      !window.confirm(
        "ATTENTION — supprimer TOUS les cours importés ?\n\n" +
          "Cela supprime :\n" +
          "  • tous les cours, chapitres, fichiers indexés\n" +
          "  • tous les résumés, fiches, flashcards et quiz générés\n" +
          "  • toute la progression de révision\n\n" +
          "Réglages et compte conservés. Tu pourras ré-importer depuis Drive ensuite.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/courses/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(`Tout supprimé : ${data.removed.courses} cours`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={run} variant="destructive" disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Tout supprimer (cours + progression)
    </Button>
  );
}

export function ResetProgressionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (
      !window.confirm(
        "Réinitialiser toute ta progression ?\n\n" +
          "Cela supprime :\n" +
          "  • toutes les révisions enregistrées (état SM-2)\n" +
          "  • l'historique des sessions et l'agenda quotidien\n\n" +
          "Le contenu de tes cours, fiches et flashcards reste intact.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/study/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(
        `Progression réinitialisée (${data.removed.reviews} révisions, ${data.removed.sessions} sessions)`,
      );
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={reset} variant="destructive" disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Réinitialiser la progression
    </Button>
  );
}

type FormValues = {
  dailyGoalMin: number;
  dailyGoalCards: number;
  examDate: string;
  reminderTime: string;
  preferredModel: string;
};

export function SettingsForm({ defaultValues }: { defaultValues: FormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(defaultValues);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Préférences enregistrées");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="goalMin">Objectif quotidien (minutes)</Label>
        <Input
          id="goalMin"
          type="number"
          min={1}
          value={values.dailyGoalMin}
          onChange={(e) => set("dailyGoalMin", Number(e.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="goalCards">Objectif cartes / jour</Label>
        <Input
          id="goalCards"
          type="number"
          min={1}
          value={values.dailyGoalCards}
          onChange={(e) => set("dailyGoalCards", Number(e.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="examDate">Date d&apos;examen</Label>
        <Input
          id="examDate"
          type="date"
          value={values.examDate}
          onChange={(e) => set("examDate", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reminder">Heure de rappel (HH:mm)</Label>
        <Input
          id="reminder"
          type="time"
          value={values.reminderTime}
          onChange={(e) => set("reminderTime", e.target.value)}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="model">Modèle Claude</Label>
        <select
          id="model"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={values.preferredModel}
          onChange={(e) => set("preferredModel", e.target.value)}
        >
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (recommandé, le moins cher)</option>
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (qualité supérieure, ~3× plus cher)</option>
          <option value="claude-opus-4-7">Claude Opus 4.7 (le plus puissant, le plus cher)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
