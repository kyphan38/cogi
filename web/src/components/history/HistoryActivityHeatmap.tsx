"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { isPracticeLevel, LEVEL_LABELS } from "@/lib/exercise/levels";
import { scoreSummary } from "@/lib/exercise/score-summary";
import { missesOf } from "@/lib/exercise/weak-spots";
import {
  activityByDay,
  activityLevel,
  activitySwatchClass,
  HEATMAP_WEEKS,
  startOfWeekMonday,
} from "@/lib/history";

const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

/** One line of facts about a finished exercise: type, level, score, main miss. */
function exerciseFacts(ex: Exercise): string {
  const level = "level" in ex && isPracticeLevel(ex.level) ? LEVEL_LABELS[ex.level] : null;
  const score = scoreSummary(ex)?.line ?? null;
  const miss = missesOf(ex)[0] ?? null;
  return [TYPE_LABEL[ex.type] ?? ex.type, level, score, miss].filter(Boolean).join(" · ");
}

/**
 * GitHub-style grid of finished exercises per day. Cells are buttons (touch screens
 * have no hover): a tap lists that day's exercises below, a row opens its review.
 */
export default function HistoryActivityHeatmap({
  rows,
  onOpenExercise,
}: {
  rows: Exercise[];
  onOpenExercise: (id: string) => void;
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonday = startOfWeekMonday(today);
  startMonday.setDate(startMonday.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const byDay = activityByDay(rows);

  const cells: ReactNode[] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const key = cellDate.toLocaleDateString("en-CA");
      const id = `${w}-${d}`;
      if (cellDate.getTime() > today.getTime()) {
        cells.push(<div key={id} className="rounded-sm bg-muted/25" aria-hidden />);
        continue;
      }
      const count = byDay.get(key)?.length ?? 0;
      const label = `${dayLabel(cellDate)} · ${count === 0 ? "nothing" : `${count} ${count === 1 ? "exercise" : "exercises"}`}`;
      const cls = cn("rounded-sm", activitySwatchClass(activityLevel(count)));
      cells.push(
        count === 0 ? (
          <div key={id} title={label} className={cls} />
        ) : (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={openDay === key}
            onClick={() => setOpenDay((prev) => (prev === key ? null : key))}
            className={cn(
              cls,
              "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
              openDay === key && "ring-1 ring-foreground ring-offset-1 ring-offset-background",
            )}
            data-testid="heatmap-day"
            data-day={key}
          />
        ),
      );
    }
  }

  const dayRows = openDay ? (byDay.get(openDay) ?? []) : [];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto p-0.5">
        <div
          className="grid gap-1"
          style={{
            gridTemplateRows: "repeat(7, 11px)",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(0, 11px)",
          }}
          role="group"
          aria-label="Finished exercises by day, oldest columns on the left"
        >
          {cells}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-meta text-muted-foreground" aria-hidden>
        <span>less</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <span key={level} className={cn("size-2.5 shrink-0 rounded-sm", activitySwatchClass(level))} />
        ))}
        <span>more</span>
      </div>

      {openDay && dayRows.length > 0 ? (
        <div data-testid="heatmap-day-list">
          <p className="section-label">{dayLabel(new Date(`${openDay}T00:00:00`))}</p>
          <ul className="mt-2 border-b border-border">
            {dayRows.map((ex) => (
              <li key={ex.id} className="border-t border-border">
                <button
                  type="button"
                  onClick={() => onOpenExercise(ex.id)}
                  className="group/row flex w-full min-w-0 items-center justify-between gap-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body">{ex.title}</span>
                    <span className="block text-meta text-muted-foreground">{exerciseFacts(ex)}</span>
                  </span>
                  <span className="shrink-0 text-body text-muted-foreground transition-colors after:ml-1 after:content-['›'] group-hover/row:text-foreground">
                    review
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
