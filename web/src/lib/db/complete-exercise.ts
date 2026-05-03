import { recordWeaknessesAfterExercise } from "@/lib/adaptive/record-weaknesses";
import { writeBatch } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/auth/firebase-client";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import { getAppSettings } from "@/lib/db/settings";
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
  const settings = await getAppSettings();
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

  const batch = writeBatch(getFirebaseFirestore());
  batch.set(
    userDocRef<Exercise>(COGI_COLLECTIONS.exercises, input.exercise.id),
    stripUndefinedDeep(input.exercise) as Exercise,
  );
  batch.set(userDocRef<JournalEntry>(COGI_COLLECTIONS.journalEntries, input.journal.id), input.journal);
  batch.set(
    userDocRef<ConfidenceRecord>(COGI_COLLECTIONS.confidenceRecords, input.confidence.id),
    input.confidence,
  );
  batch.set(userDocRef<ActionBridge>(COGI_COLLECTIONS.actions, input.action.id), input.action);
  if (recallRow) {
    batch.set(
      userDocRef<DelayedRecallQueueRow>(COGI_COLLECTIONS.delayedRecallQueue, recallRow.id),
      recallRow,
    );
  }
  await batch.commit();
  try {
    await recordWeaknessesAfterExercise(input.exercise, input.confidence);
  } catch (e) {
    console.error(
      "[completeExerciseFlow] weakness recording failed (exercise saved ok):",
      e,
    );
  }
}
