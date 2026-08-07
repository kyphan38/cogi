"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EvaluativeScoringRow } from "@/lib/types/exercise";

export interface EvaluativeStakeholderMappingCardProps {
  exercise: EvaluativeScoringRow;
  rows: { name: string; wants: string }[];
  revealed: boolean;
  onRowsChange: (rows: { name: string; wants: string }[]) => void;
  onRevealedChange: (revealed: boolean) => void;
  onError: (message: string | null) => void;
  onBack: () => void;
  onContinue: (cleaned: { name: string; wants: string }[]) => void;
}

export function EvaluativeStakeholderMappingCard({
  exercise,
  rows,
  revealed,
  onRowsChange,
  onRevealedChange,
  onError,
  onBack,
  onContinue,
}: EvaluativeStakeholderMappingCardProps) {
  const hasCandidates = Boolean(
    exercise.stakeholderCandidates && exercise.stakeholderCandidates.length > 0,
  );

  if (!revealed) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Before scoring, list the stakeholders affected by this decision and what each one wants.
        </p>
        {hasCandidates ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {exercise.stakeholderCandidates!.map((c) => {
                const selected = rows.some((r) => r.name === c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const idx = rows.findIndex((r) => r.name === c);
                      if (idx >= 0) {
                        const next = [...rows];
                        next[idx] = { name: "", wants: "" };
                        onRowsChange(next);
                        return;
                      }
                      const emptyIdx = rows.findIndex((r) => !r.name.trim());
                      if (emptyIdx >= 0) {
                        const next = [...rows];
                        next[emptyIdx] = { name: c, wants: next[emptyIdx]!.wants };
                        onRowsChange(next);
                        return;
                      }
                      if (rows.length < 5) {
                        onRowsChange([...rows, { name: c, wants: "" }]);
                      }
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              {rows.filter((r) => r.name.trim()).length}/5 selected
            </p>
          </div>
        ) : null}
        <div className="grid gap-3">
          {rows.map((row, idx) => {
            if (hasCandidates && !row.name.trim()) return null;
            return (
              <div key={idx} className="grid gap-2 sm:grid-cols-2">
                {hasCandidates ? (
                  <p className="flex items-center text-sm font-medium">{row.name}</p>
                ) : (
                  <Input
                    value={row.name}
                    placeholder={`Stakeholder ${idx + 1}`}
                    maxLength={80}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx]!, name: e.target.value };
                      onRowsChange(next);
                    }}
                  />
                )}
                <Input
                  value={row.wants}
                  placeholder="What they want"
                  maxLength={200}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx]!, wants: e.target.value };
                    onRowsChange(next);
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          {hasCandidates ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                rows.length < 5 ? onRowsChange([...rows, { name: "", wants: "" }]) : undefined
              }
              disabled={rows.length >= 5}
            >
              Add row
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              const cleaned = rows
                .map((e) => ({ name: e.name.trim(), wants: e.wants.trim() }))
                .filter((e) => e.name && e.wants);
              if (cleaned.length < 3) {
                onError("Enter at least 3 stakeholders with what each wants.");
                return;
              }
              onError(null);
              onRevealedChange(true);
            }}
          >
            Compare with AI
          </Button>
        </div>
      </div>
    );
  }

  const cleaned = rows
    .map((e) => ({ name: e.name.trim(), wants: e.wants.trim() }))
    .filter((e) => e.name && e.wants);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
            Your stakeholders
          </p>
          <ul className="space-y-2 text-sm">
            {cleaned.map((e, i) => (
              <li key={i}>
                <p className="font-medium">{e.name}</p>
                <p className="text-muted-foreground text-xs">{e.wants}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">AI reference</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{exercise.stakeholderNote}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => onRevealedChange(false)}>
          Edit
        </Button>
        <Button type="button" onClick={() => onContinue(cleaned)}>
          Continue to evaluate
        </Button>
      </div>
    </div>
  );
}
