// What a finished exercise fed, as rows with real dates (PLAN-guide G3).

import { REDO_AFTER_DAYS } from "@/lib/exercise/redo";
import { USE_CHECK_AFTER_DAYS } from "@/lib/exercise/use-plan";
import { addDays } from "@/lib/review/schedule";

export interface WentRow {
  what: string;
  where: string;
  href: string;
  /** Local day (YYYY-MM-DD) when it comes back. */
  back: string;
  backLabel: string;
}

export function whereItWent({
  today,
  usePlan,
}: {
  today: string;
  usePlan: string;
}): WentRow[] {
  const rows: WentRow[] = [
    {
      what: "1 exercise",
      where: "Past exercises",
      href: "/exercise/history",
      back: addDays(today, REDO_AFTER_DAYS),
      backLabel: "redo from",
    },
  ];
  if (usePlan.trim()) {
    rows.push({
      what: "1 plan",
      where: "Today",
      href: "/",
      back: addDays(today, USE_CHECK_AFTER_DAYS),
      backLabel: "asks on",
    });
  }
  return rows;
}
