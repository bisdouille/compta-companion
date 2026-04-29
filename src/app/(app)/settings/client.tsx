"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (recommandé, rapide & pas cher)</option>
          <option value="claude-opus-4-7">Claude Opus 4.7 (plus puissant, plus cher)</option>
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (le moins cher)</option>
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
