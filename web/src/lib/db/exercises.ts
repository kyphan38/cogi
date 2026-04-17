import { getDb } from "@/lib/db/schema";
import type { ConfidenceRecord, Exercise, ThinkingType } from "@/lib/types/exercise";

export async function putExercise(ex: Exercise): Promise<void> {
  await getDb().exercises.put(ex);
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  return getDb().exercises.get(id);
}

export type CompletedExerciseFilter = {
  type?: ThinkingType | "all";
  domainContains?: string;
  completedAfter?: string;
  completedBefore?: string;
};

/** Completed exercises, newest first by `completedAt`, optional client-side filters. */
export async function listCompletedExercises(
  filter?: CompletedExerciseFilter,
): Promise<Exercise[]> {
  const all = await getDb().exercises.toArray();
  let rows = all.filter(
    (e): e is Exercise & { completedAt: string } => e.completedAt != null,
  );

  const f = filter ?? {};
  if (f.type && f.type !== "all") {
    rows = rows.filter((e) => e.type === f.type);
  }
  if (f.domainContains?.trim()) {
    const q = f.domainContains.trim().toLowerCase();
    rows = rows.filter((e) => e.domain.toLowerCase().includes(q));
  }
  if (f.completedAfter?.trim()) {
    rows = rows.filter((e) => e.completedAt! >= f.completedAfter!);
  }
  if (f.completedBefore?.trim()) {
    rows = rows.filter((e) => e.completedAt! <= f.completedBefore!);
  }

  return rows.sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
}

/** Completed exercises, newest first (for journal rotation + decision picker). */
export async function listRecentCompletedExercises(
  limit: number,
): Promise<Exercise[]> {
  const rows = await listCompletedExercises();
  return rows.slice(0, limit);
}

/** Count completed exercises of a given thinking type (for generative scaffold, etc.). */
export async function countCompletedByType(type: ThinkingType): Promise<number> {
  const rows = await listCompletedExercises({ type });
  return rows.length;
}

export async function getConfidenceRecordForExercise(
  exerciseId: string,
): Promise<ConfidenceRecord | undefined> {
  return getDb().confidenceRecords.where("exerciseId").equals(exerciseId).first();
}

/** All calibration rows, oldest first (for charts). */
export async function listConfidenceRecords(): Promise<ConfidenceRecord[]> {
  const rows = await getDb().confidenceRecords.toArray();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Permanently remove one completed exercise and its journal, calibration, action,
 * delayed-recall queue rows, and perspective disagreements (same browser / IndexedDB).
 */
export async function deleteCompletedExerciseAndRelatedRecords(
  exerciseId: string,
): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    [
      db.journalEntries,
      db.confidenceRecords,
      db.actions,
      db.delayedRecallQueue,
      db.perspectiveDisagreements,
      db.exercises,
    ],
    async () => {
      await db.journalEntries.where("exerciseId").equals(exerciseId).delete();
      await db.confidenceRecords.where("exerciseId").equals(exerciseId).delete();
      await db.actions.where("exerciseId").equals(exerciseId).delete();
      await db.delayedRecallQueue.where("exerciseId").equals(exerciseId).delete();
      await db.perspectiveDisagreements.where("exerciseId").equals(exerciseId).delete();
      await db.exercises.delete(exerciseId);
    },
  );
}

export async function listRecentExercisesForPicker(
  limit: number,
): Promise<Pick<Exercise, "id" | "title" | "domain" | "createdAt">[]> {
  const all = await getDb()
    .exercises.orderBy("createdAt")
    .reverse()
    .limit(limit)
    .toArray();
  return all.map((e) => ({
    id: e.id,
    title: e.title,
    domain: e.domain,
    createdAt: e.createdAt,
  }));
}
