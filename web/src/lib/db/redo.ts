import { listIncompleteExercises, putExercise } from "@/lib/db/exercises";
import { redoRow, type PracticeRow } from "@/lib/exercise/redo";

/**
 * Start (or continue) a redo of a finished exercise and return the page to open.
 * `redo=1` lets the finish card link back to the comparison in History.
 */
export async function startRedo(ex: PracticeRow): Promise<string> {
  const open = (await listIncompleteExercises()).find((r) => "redoOf" in r && r.redoOf === ex.id);
  const row = open ?? redoRow(ex, crypto.randomUUID(), new Date().toISOString());
  if (!open) await putExercise(row);
  return `/exercise/${row.type}?resumeId=${encodeURIComponent(row.id)}&redo=1`;
}
