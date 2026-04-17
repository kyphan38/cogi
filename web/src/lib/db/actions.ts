import { setDoc, Unsubscribe } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { ActionBridge } from "@/lib/types/action";
import type { Exercise } from "@/lib/types/exercise";

export async function putAction(row: ActionBridge): Promise<void> {
  await setDoc(userDocRef<ActionBridge>(COGI_COLLECTIONS.actions, row.id), row);
}

export async function listActionsWithExerciseMeta(): Promise<
  (ActionBridge & { exerciseTitle: string; exerciseCreatedAt: string })[]
> {
  const [actions, exercises] = await Promise.all([
    listCollectionRows<ActionBridge>(COGI_COLLECTIONS.actions),
    listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises),
  ]);
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const withMeta = await Promise.all(
    actions.map(async (a) => {
      const ex = exerciseById.get(a.exerciseId);
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

export function subscribeActionsWithExerciseMeta(
  onData: (rows: (ActionBridge & { exerciseTitle: string; exerciseCreatedAt: string })[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<ActionBridge>(
    COGI_COLLECTIONS.actions,
    async () => {
      const rows = await listActionsWithExerciseMeta();
      onData(rows);
    },
    onError,
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

export async function toggleActionFollowThroughWeek(
  row: ActionBridge,
  weekKey: string,
): Promise<void> {
  const next = [...row.weeklyFollowThrough];
  const idx = next.findIndex((item) => item.weekKey === weekKey);
  if (idx >= 0) {
    next[idx] = { ...next[idx], done: !next[idx].done };
  } else {
    next.push({ weekKey, done: true });
  }
  await putAction({ ...row, weeklyFollowThrough: next });
}

export function currentIsoWeekKey(): string {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}
