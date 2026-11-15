/**
 * Pure parts shared by the practice exercise flows (the hook is
 * components/exercises/flow/useExerciseFlow.ts).
 */
import type { PendingSave } from "@/lib/hooks/useSaveOnLeave";
import type { Exercise } from "@/lib/types/exercise";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

/** Step every flow shows after Finish ("Saved"). */
export const DONE_STEP = 7;

export const DEFAULT_CONFIDENCE = 50;

/** An unfinished row of the expected type, or null when it cannot be resumed. */
export function resumableRow<Row extends Exercise>(
  row: Exercise | undefined,
  isRow: (ex: Exercise) => ex is Row,
): Row | null {
  if (!row || row.completedAt || !isRow(row)) return null;
  return row;
}

type CommonFields = {
  confidenceBefore?: number | null;
  takeaway?: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
};

/** The state every flow restores from a saved row. `perspectiveStructured` undefined: keep the current one. */
export function commonResumeState(row: CommonFields): {
  confidence: number;
  takeaway: string;
  perspectiveStructured: AIPerspectiveStructured | undefined;
} {
  return {
    confidence: row.confidenceBefore ?? DEFAULT_CONFIDENCE,
    takeaway: row.takeaway ?? "",
    perspectiveStructured: row.aiPerspectiveStructured ?? undefined,
  };
}

/**
 * Runs `save` after `delayMs` unless cancelled first. Until then it is the pending save,
 * so leaving the page runs it at once. Returns the cancel function.
 */
export function scheduleSave(pending: PendingSave, save: () => void, delayMs: number): () => void {
  pending.set(save);
  const timer = setTimeout(() => {
    pending.clear();
    save();
  }, delayMs);
  return () => clearTimeout(timer);
}
