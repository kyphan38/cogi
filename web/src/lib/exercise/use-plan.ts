import { addDays, localDay } from "@/lib/review/schedule";
import type { UseCheck } from "@/lib/types/exercise";

/** Days between finishing an exercise and the "Did you use it?" question. */
export const USE_CHECK_AFTER_DAYS = 7;

/** After this many more days an unanswered question is dropped, so old ones do not pile up. */
export const USE_CHECK_WINDOW_DAYS = 21;

export type UsePlanRow = {
  id: string;
  title: string;
  completedAt: string | null;
  usePlan?: string | null;
  useCheck?: UseCheck | null;
};

/**
 * Finished exercises whose "where will you use this" plan is due for its check on
 * `today` (a local day), oldest first.
 */
export function dueUseChecks<Row extends UsePlanRow>(rows: Row[], today: string): Row[] {
  return rows
    .filter((r) => {
      if (!r.completedAt || !r.usePlan?.trim() || r.useCheck) return false;
      const due = addDays(localDay(new Date(r.completedAt)), USE_CHECK_AFTER_DAYS);
      return due <= today && today <= addDays(due, USE_CHECK_WINDOW_DAYS);
    })
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));
}

export const USE_CHECK_LABEL: Record<UseCheck["result"], string> = {
  yes: "Used it",
  partly: "Partly used it",
  no: "Did not use it",
};
