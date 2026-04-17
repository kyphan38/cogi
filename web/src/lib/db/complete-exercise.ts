import { recordWeaknessesAfterExercise } from "@/lib/adaptive/record-weaknesses";
import { getDb } from "@/lib/db/schema";
import type { Exercise } from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import type { DelayedRecallQueueRow } from "@/lib/types/insights";

function addHoursIso(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + hours * 3600 * 1000);
  return d.toISOString();
}

/**
 * Atomically persist finished exercise + journal + confidence + action (Phase 1.6).
 * Phase 5: enqueue delayed recall (48h) when enabled in settings.
 */
export async function completeExerciseFlow(input: {
  exercise: Exercise;
  journal: JournalEntry;
  confidence: ConfidenceRecord;
  action: ActionBridge;
}): Promise<void> {
  const db = getDb();
  const settings = await db.settings.get("app");
  const recallOn = settings?.delayedRecallEnabled !== false;
  const completedAt = input.exercise.completedAt ?? new Date().toISOString();

  const recallRow: DelayedRecallQueueRow | null = recallOn
    ? {
        id: crypto.randomUUID(),
        exerciseId: input.exercise.id,
        exerciseTitle: input.exercise.title,
        completedAt,
        dueAt: addHoursIso(completedAt, 48),
        status: "pending",
        userAnswer: null,
        feedbackText: null,
        dismissedAt: null,
        answeredAt: null,
      }
    : null;

  const run = async () => {
    await db.exercises.put(input.exercise);
    await db.journalEntries.put(input.journal);
    await db.confidenceRecords.put(input.confidence);
    await db.actions.put(input.action);
    if (recallRow) {
      await db.delayedRecallQueue.put(recallRow);
    }
  };

  const tables = recallRow
    ? ([db.exercises, db.journalEntries, db.confidenceRecords, db.actions, db.delayedRecallQueue] as const)
    : ([db.exercises, db.journalEntries, db.confidenceRecords, db.actions] as const);

  await db.transaction("rw", tables, run);
  await recordWeaknessesAfterExercise(input.exercise, input.confidence);
}
