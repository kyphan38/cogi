"use client";

import type { Forecast } from "@/lib/forecasts/logic";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDueDay(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

/** Forecasts whose day has come: say what happened. Used on Today and on the Forecasts page. */
export function ForecastDueList({ due, onResolve }: { due: Forecast[]; onResolve: (id: string, outcome: "yes" | "no") => void }) {
  return (
    <div className="border-b border-border" data-testid="forecast-due">
      {due.map((f) => (
        <div key={f.id} className="border-t border-border py-3">
          <p className="text-body">{f.question}</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
            <p className="text-meta text-muted-foreground tabular-nums">
              You said {f.probability}% · due {formatDueDay(f.dueDay)}
            </p>
            <div className="flex gap-5 text-body">
              <button type="button" className="font-medium text-foreground" onClick={() => onResolve(f.id, "yes")}>
                it happened
              </button>
              <button type="button" className="font-medium text-foreground" onClick={() => onResolve(f.id, "no")}>
                it did not
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
