"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RealDecisionLogEntry } from "@/lib/types/decision";
import { putDecision } from "@/lib/db/decisions";

export interface DecisionRemindersCardProps {
  decisions: RealDecisionLogEntry[];
}

function overdueReminders(rows: RealDecisionLogEntry[], nowIso: string): RealDecisionLogEntry[] {
  return rows
    .filter(
      (d) =>
        d.remindOutcomeAt != null &&
        d.remindOutcomeAt <= nowIso &&
        (d.outcomeReminderDismissedAt == null || d.outcomeReminderDismissedAt === ""),
    )
    .sort((a, b) => (a.remindOutcomeAt ?? "").localeCompare(b.remindOutcomeAt ?? ""));
}

export function DecisionRemindersCard({ decisions }: DecisionRemindersCardProps) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const due = useMemo(
    () => overdueReminders(decisions, new Date().toISOString()).slice(0, 5),
    [decisions],
  );

  const dismiss = async (row: RealDecisionLogEntry) => {
    setError(null);
    setDismissingId(row.id);
    try {
      const ts = new Date().toISOString();
      await putDecision({ ...row, outcomeReminderDismissedAt: ts });
    } catch (e) {
      console.error("DecisionRemindersCard dismiss", e);
      setError("Could not dismiss. Try again.");
    } finally {
      setDismissingId(null);
    }
  };

  if (due.length === 0) {
    return (
      <p className="text-muted-foreground text-xs italic">
        No outcome reminders due — when a logged decision reaches its reminder date, it will show here.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <ul className="space-y-3">
        {due.map((d) => (
          <li key={d.id} className="rounded-md border border-border/80 p-2">
            <p className="line-clamp-2 font-medium leading-snug">{d.text}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {d.domain} · due {d.remindOutcomeAt?.slice(0, 10) ?? ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/decisions"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
              >
                Open decisions
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={dismissingId === d.id}
                onClick={() => void dismiss(d)}
              >
                {dismissingId === d.id ? "Saving…" : "Dismiss"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
