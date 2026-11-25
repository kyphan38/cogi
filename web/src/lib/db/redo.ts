import { listIncompleteExercises, putExercise } from "@/lib/db/exercises";
import { redoRow, type PracticeRow } from "@/lib/exercise/redo";

/**
 * Start (or continue) a redo of a finished exercise and return the page to open.
 * `redo=1` lets the finish card link back to the comparison in History. `trackStepId`
 * marks the redo as the adaptive track step that started it.
 */
export async function startRedo(ex: PracticeRow, trackStepId?: string): Promise<string> {
  // Only practice rows carry `redoOf`, so a match is a practice row.
  const open = (await listIncompleteExercises()).find((r) => "redoOf" in r && r.redoOf === ex.id) as PracticeRow | undefined;
  const row = open ?? redoRow(ex, crypto.randomUUID(), new Date().toISOString());
  // A track step claims the redo, even one that was already open.
  const claim = trackStepId && row.trackStepId !== trackStepId;
  if (claim) row.trackStepId = trackStepId;
  if (!open || claim) await putExercise(row);
  return `/exercise/${row.type}?resumeId=${encodeURIComponent(row.id)}&redo=1`;
}
