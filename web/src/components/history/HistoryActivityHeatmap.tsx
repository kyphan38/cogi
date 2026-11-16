"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/types/exercise";
import {
  HEATMAP_WEEKS,
  startOfWeekMonday,
  typeSwatchClass,
} from "@/lib/history";

export default function HistoryActivityHeatmap({ rows }: { rows: Exercise[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonday = startOfWeekMonday(today);
  startMonday.setDate(startMonday.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const latestByDay = new Map<string, { type: Exercise["type"]; at: string }>();
  for (const ex of rows) {
    if (!ex.completedAt) continue;
    const key = new Date(ex.completedAt).toLocaleDateString("en-CA");
    const prev = latestByDay.get(key);
    if (!prev || ex.completedAt > prev.at) {
      latestByDay.set(key, { type: ex.type, at: ex.completedAt });
    }
  }

  const cells: ReactNode[] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const key = cellDate.toLocaleDateString("en-CA");
      const afterToday = cellDate.getTime() > today.getTime();
      const entry = latestByDay.get(key);
      const title = afterToday
        ? ""
        : cellDate.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
      cells.push(
        <div
          key={`${w}-${d}`}
          title={title}
          className={cn(
            "rounded-sm",
            afterToday
              ? "bg-muted/25"
              : entry
                ? typeSwatchClass(entry.type)
                : "bg-muted/50",
          )}
        />,
      );
    }
  }

  const legend: { type: Exercise["type"] | "other"; label: string }[] = [
    { type: "evaluative", label: "Evaluative" },
    { type: "systems", label: "Systems" },
    { type: "analytical", label: "Analytical" },
    { type: "other", label: "Other" },
  ];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateRows: "repeat(7, 11px)",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(0, 11px)",
          }}
          role="img"
          aria-label="Completed exercises by day, oldest columns on the left"
        >
          {cells}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {legend.map(({ type, label }) => (
          <div
            key={type}
            className="flex items-center gap-1.5 text-meta text-muted-foreground"
          >
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-sm",
                typeSwatchClass(type as Exercise["type"]),
              )}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
