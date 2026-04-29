"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Cell = { date: string; minutes: number; cards: number };

function color(minutes: number) {
  if (minutes <= 0) return "bg-muted";
  if (minutes < 5) return "bg-primary/20";
  if (minutes < 15) return "bg-primary/40";
  if (minutes < 30) return "bg-primary/70";
  return "bg-primary";
}

export function Heatmap({ data, weeks = 26 }: { data: Cell[]; weeks?: number }) {
  // Build a 7 x weeks grid ending today.
  const map = new Map(data.map((d) => [d.date, d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { date: string; minutes: number; cards: number }[] = [];
  const totalDays = weeks * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = map.get(key);
    days.push({ date: key, minutes: entry?.minutes ?? 0, cards: entry?.cards ?? 0 });
  }

  // Group into columns of 7 (Mon..Sun)
  const cols: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex gap-[3px] overflow-x-auto">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((d) => (
              <Tooltip key={d.date}>
                <TooltipTrigger asChild>
                  <div className={cn("heatmap-cell h-3 w-3", color(d.minutes))} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="font-medium">{d.date}</div>
                  <div>
                    {d.minutes} min — {d.cards} cartes
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Moins</span>
        <div className="heatmap-cell h-3 w-3 bg-muted" />
        <div className="heatmap-cell h-3 w-3 bg-primary/20" />
        <div className="heatmap-cell h-3 w-3 bg-primary/40" />
        <div className="heatmap-cell h-3 w-3 bg-primary/70" />
        <div className="heatmap-cell h-3 w-3 bg-primary" />
        <span>Plus</span>
      </div>
    </TooltipProvider>
  );
}
