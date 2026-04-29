"use client";

import { useState } from "react";
import { FolderSync, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DrivePicker } from "@/components/drive-picker";

export function CoursesActions({ hasRoot, primary }: { hasRoot: boolean; primary?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        // pas de root → ouvre le picker
        setOpen(true);
        return;
      }
      toast.success("Drive synchronisé");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {hasRoot ? (
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSync className="h-4 w-4" />}
            Mettre à jour
          </Button>
        ) : null}
        <Button onClick={() => setOpen(true)} variant={primary ? "default" : hasRoot ? "secondary" : "default"}>
          <Plus className="h-4 w-4" /> Importer un dossier
        </Button>
      </div>
      <DrivePicker open={open} onOpenChange={setOpen} />
    </>
  );
}
