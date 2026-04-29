"use client";

import { useEffect, useState } from "react";
import { Folder, ChevronRight, Loader2, Home } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Crumb = { id: string; name: string };
type DriveListing = {
  folders: { id: string; name: string }[];
  files: { id: string; name: string; mimeType: string }[];
};

export function DrivePicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: "root", name: "Mon Drive" }]);
  const [listing, setListing] = useState<DriveListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const current = crumbs[crumbs.length - 1];

  useEffect(() => {
    if (!open) return;
    void load(current.id);
  }, [open, current.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load(folderId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/drive/list?folderId=${encodeURIComponent(folderId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur Drive");
      }
      setListing(await res.json());
    } catch (e) {
      toast.error("Impossible de lister le Drive : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function enter(f: { id: string; name: string }) {
    setCrumbs([...crumbs, f]);
  }
  function jumpTo(idx: number) {
    setCrumbs(crumbs.slice(0, idx + 1));
  }

  async function importHere() {
    setImporting(true);
    try {
      const res = await fetch("/api/drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: current.id, courseTitle: current.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de synchronisation");
      toast.success(
        `Import réussi ! ${data.courses.length} cours · ${data.courses.reduce(
          (a: number, c: { documents: number }) => a + c.documents,
          0,
        )} documents`,
      );
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choisis le dossier de tes cours</DialogTitle>
          <DialogDescription>
            Navigue dans ton Drive et sélectionne le dossier à importer. Chaque sous-dossier
            deviendra un cours, les sous-sous-dossiers des chapitres.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          {crumbs.map((c, i) => (
            <span key={c.id + i} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3 w-3" /> : <Home className="h-3 w-3" />}
              <button
                className="hover:text-foreground"
                onClick={() => jumpTo(i)}
                disabled={i === crumbs.length - 1}
              >
                {c.name}
              </button>
            </span>
          ))}
        </div>

        <ScrollArea className="h-72 rounded border">
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="divide-y">
              {listing?.folders.length === 0 && listing?.files.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Dossier vide
                </li>
              ) : null}
              {listing?.folders.map((f) => (
                <li key={f.id}>
                  <button
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent"
                    onClick={() => enter(f)}
                  >
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
              {listing?.files.map((f) => (
                <li key={f.id} className="px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-4 w-4 inline-block rounded bg-muted" />
                  <span className="truncate">{f.name}</span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Annuler
          </Button>
          <Button onClick={importHere} disabled={importing || loading}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importer ce dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
