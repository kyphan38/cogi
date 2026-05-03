import { Unsubscribe, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/auth/firebase-client";
import {
  COGI_COLLECTIONS,
  listCollectionRows,
  subscribeCollectionRows,
  userDocRef,
} from "@/lib/db/firestore";
import type { ConfidenceRecord, Exercise, ThinkingType } from "@/lib/types/exercise";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";

export async function putExercise(ex: Exercise): Promise<void> {
  await setDoc(
    userDocRef<Exercise>(COGI_COLLECTIONS.exercises, ex.id),
    stripUndefinedDeep(ex) as Exercise,
  );
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  const snapshot = await getDoc(userDocRef<Exercise>(COGI_COLLECTIONS.exercises, id));
  return snapshot.exists() ? (snapshot.data() as Exercise) : undefined;
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
  const all = await listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises);
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

export function subscribeCompletedExercises(
  filter: CompletedExerciseFilter | undefined,
  onData: (rows: Exercise[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<Exercise>(
    COGI_COLLECTIONS.exercises,
    (rows) => {
      const completedRows = rows.filter(
        (e): e is Exercise & { completedAt: string } => e.completedAt != null,
      );
      const f = filter ?? {};
      let next = completedRows;
      if (f.type && f.type !== "all") {
        next = next.filter((e) => e.type === f.type);
      }
      if (f.domainContains?.trim()) {
        const q = f.domainContains.trim().toLowerCase();
        next = next.filter((e) => e.domain.toLowerCase().includes(q));
      }
      if (f.completedAfter?.trim()) {
        next = next.filter((e) => e.completedAt! >= f.completedAfter!);
      }
      if (f.completedBefore?.trim()) {
        next = next.filter((e) => e.completedAt! <= f.completedBefore!);
      }
      onData(next.sort((a, b) => b.completedAt!.localeCompare(a.completedAt!)));
    },
    onError,
  );
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
  const rows = await listCollectionRows<ConfidenceRecord>(COGI_COLLECTIONS.confidenceRecords);
  return rows.find((row) => row.exerciseId === exerciseId);
}

/** All calibration rows, oldest first (for charts). */
export async function listConfidenceRecords(): Promise<ConfidenceRecord[]> {
  const rows = await listCollectionRows<ConfidenceRecord>(COGI_COLLECTIONS.confidenceRecords);
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function subscribeConfidenceRecords(
  onData: (rows: ConfidenceRecord[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<ConfidenceRecord>(
    COGI_COLLECTIONS.confidenceRecords,
    (rows) => onData(rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))),
    onError,
  );
}

/**
 * Permanently remove one completed exercise and its journal, calibration, action,
 * delayed-recall queue rows, and perspective disagreements (Firestore).
 */
export async function deleteCompletedExerciseAndRelatedRecords(
  exerciseId: string,
): Promise<void> {
  const [journals, confidenceRows, actions, recallRows, disagreements] = await Promise.all([
    listCollectionRows<{ id: string; exerciseId: string }>(COGI_COLLECTIONS.journalEntries),
    listCollectionRows<{ id: string; exerciseId: string }>(COGI_COLLECTIONS.confidenceRecords),
    listCollectionRows<{ id: string; exerciseId: string }>(COGI_COLLECTIONS.actions),
    listCollectionRows<{ id: string; exerciseId: string }>(COGI_COLLECTIONS.delayedRecallQueue),
    listCollectionRows<{ id: string; exerciseId: string }>(COGI_COLLECTIONS.perspectiveDisagreements),
  ]);

  const batch = writeBatch(getFirebaseFirestore());
  for (const row of journals.filter((row) => row.exerciseId === exerciseId)) {
    batch.delete(userDocRef(COGI_COLLECTIONS.journalEntries, row.id));
  }
  for (const row of confidenceRows.filter((row) => row.exerciseId === exerciseId)) {
    batch.delete(userDocRef(COGI_COLLECTIONS.confidenceRecords, row.id));
  }
  for (const row of actions.filter((row) => row.exerciseId === exerciseId)) {
    batch.delete(userDocRef(COGI_COLLECTIONS.actions, row.id));
  }
  for (const row of recallRows.filter((row) => row.exerciseId === exerciseId)) {
    batch.delete(userDocRef(COGI_COLLECTIONS.delayedRecallQueue, row.id));
  }
  for (const row of disagreements.filter((row) => row.exerciseId === exerciseId)) {
    batch.delete(userDocRef(COGI_COLLECTIONS.perspectiveDisagreements, row.id));
  }
  batch.delete(userDocRef(COGI_COLLECTIONS.exercises, exerciseId));
  await batch.commit();
}

export async function listRecentExercisesForPicker(
  limit: number,
): Promise<Pick<Exercise, "id" | "title" | "domain" | "createdAt">[]> {
  const all = (await listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
  return all.map((e) => ({
    id: e.id,
    title: e.title,
    domain: e.domain,
    createdAt: e.createdAt,
  }));
}

export function subscribeRecentExercisesForPicker(
  limit: number,
  onData: (rows: Pick<Exercise, "id" | "title" | "domain" | "createdAt">[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<Exercise>(
    COGI_COLLECTIONS.exercises,
    (rows) => {
      const next = [...rows]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((row) => ({
          id: row.id,
          title: row.title,
          domain: row.domain,
          createdAt: row.createdAt,
        }));
      onData(next);
    },
    onError,
  );
}

/** In-progress exercises (generated but not yet completed), newest first. */
export async function listIncompleteExercises(): Promise<Exercise[]> {
  const all = await listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises);
  return all
    .filter((e) => e.completedAt === null && (e.currentStep ?? 0) > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRecentDomains(limit: number = 20): Promise<string[]> {
  const all = await listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises);
  const freq = new Map<string, { count: number; latest: string }>();
  for (const ex of all) {
    const d = ex.domain.trim();
    if (!d) continue;
    const prev = freq.get(d);
    if (!prev) {
      freq.set(d, { count: 1, latest: ex.createdAt });
    } else {
      prev.count += 1;
      if (ex.createdAt > prev.latest) prev.latest = ex.createdAt;
    }
  }
  return [...freq.entries()]
    .sort(
      (a, b) => b[1].count - a[1].count || b[1].latest.localeCompare(a[1].latest),
    )
    .slice(0, limit)
    .map(([domain]) => domain);
}

export function subscribeRecentDomains(
  limit: number,
  onData: (domains: string[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<Exercise>(
    COGI_COLLECTIONS.exercises,
    (rows) => {
      const freq = new Map<string, { count: number; latest: string }>();
      for (const ex of rows) {
        const d = ex.domain.trim();
        if (!d) continue;
        const prev = freq.get(d);
        if (!prev) {
          freq.set(d, { count: 1, latest: ex.createdAt });
        } else {
          prev.count += 1;
          if (ex.createdAt > prev.latest) prev.latest = ex.createdAt;
        }
      }
      const sorted = [...freq.entries()]
        .sort(
          (a, b) =>
            b[1].count - a[1].count || b[1].latest.localeCompare(a[1].latest),
        )
        .slice(0, limit)
        .map(([domain]) => domain);
      onData(sorted);
    },
    onError,
  );
}
