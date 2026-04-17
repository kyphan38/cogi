import { getDb } from "@/lib/db/schema";
import type { ActionBridge } from "@/lib/types/action";

export async function putAction(row: ActionBridge): Promise<void> {
  await getDb().actions.put(row);
}

export async function listActionsWithExerciseMeta(): Promise<
  (ActionBridge & { exerciseTitle: string; exerciseCreatedAt: string })[]
> {
  const actions = await getDb().actions.toArray();
  const withMeta = await Promise.all(
    actions.map(async (a) => {
      const ex = await getDb().exercises.get(a.exerciseId);
      return {
        ...a,
        exerciseTitle: ex?.title ?? "(unknown)",
        exerciseCreatedAt: ex?.createdAt ?? "",
      };
    }),
  );
  return withMeta.sort((a, b) =>
    b.exerciseCreatedAt.localeCompare(a.exerciseCreatedAt),
  );
}

const MS_14D = 14 * 24 * 3600 * 1000;

/** Actions created in the last 14 days (Phase 5.2 weekly review input). */
export async function listActionsFromLast14Days(): Promise<
  (ActionBridge & { exerciseTitle: string; exerciseCreatedAt: string })[]
> {
  const cutoff = new Date(Date.now() - MS_14D).toISOString();
  const all = await listActionsWithExerciseMeta();
  return all.filter((a) => a.createdAt >= cutoff);
}

export function currentIsoWeekKey(): string {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}
