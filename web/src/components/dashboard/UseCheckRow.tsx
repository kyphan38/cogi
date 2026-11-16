"use client";

import { useState } from "react";

import { Section, WORD_LINK } from "@/components/shared/Section";
import { Input } from "@/components/ui/input";
import { saveUseCheck } from "@/lib/db/exercises";
import { dueUseChecks } from "@/lib/exercise/use-plan";
import { localDay } from "@/lib/review/schedule";
import { isSideExercise, type Exercise, type UseCheck } from "@/lib/types/exercise";

const RESULTS: UseCheck["result"][] = ["yes", "partly", "no"];

/**
 * Today: a week after an exercise, ask whether the "where will you use this" plan
 * happened. One question at a time, the oldest first.
 */
export function UseCheckRow({ completed }: { completed: Exercise[] }) {
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<UseCheck["result"] | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const row = dueUseChecks(
    completed.filter((e) => !isSideExercise(e) && !answered.has(e.id)),
    localDay(new Date()),
  )[0];
  if (!row || isSideExercise(row)) return null;

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    setError(false);
    try {
      await saveUseCheck(row.id, { result, note: note.trim(), at: new Date().toISOString() });
      setAnswered((prev) => new Set(prev).add(row.id));
      setResult(null);
      setNote("");
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Did you use it?" data-testid="use-check">
      <p className="text-lead">{row.usePlan}</p>
      <p className="mt-1 truncate text-meta text-muted-foreground">Your plan a week ago · {row.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-body">
        {RESULTS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={result === r}
            onClick={() => setResult(r)}
            className={result === r ? "font-medium text-foreground" : WORD_LINK.replace("text-meta", "text-body")}
          >
            {r}
          </button>
        ))}
      </div>
      {result ? (
        <div className="fade-in mt-3 flex items-center gap-3">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            placeholder="What happened? (optional)"
            aria-label="What happened"
            maxLength={300}
            disabled={saving}
          />
          <button type="button" className="shrink-0 text-body font-medium text-foreground" onClick={() => void save()} disabled={saving}>
            {saving ? "saving" : "save"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-meta font-medium text-foreground" role="alert">
          Not saved. Try again.
        </p>
      ) : null}
    </Section>
  );
}
