import { Unsubscribe, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import {
  COGI_COLLECTIONS,
  listCollectionRows,
  subscribeCollectionRows,
  userDocRef,
  type RowQuery,
} from "@/lib/db/firestore";
import type { Exercise, ThinkingType } from "@/lib/types/exercise";
import { PRACTICE_EXERCISE_TYPES } from "@/lib/exercise/exercise-mode-cards";
import { e2eDeleteDoc, e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";

export async function putExercise(ex: Exercise): Promise<void> {
  const data = stripUndefinedDeep(ex) as Exercise;
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.exercises, ex.id, data as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<Exercise>(COGI_COLLECTIONS.exercises, ex.id), data);
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  if (isE2EAuthBypass()) {
    return e2eGetDoc<Exercise>(COGI_COLLECTIONS.exercises, id);
  }
  const snapshot = await getDoc(userDocRef<Exercise>(COGI_COLLECTIONS.exercises, id));
  return snapshot.exists() ? (snapshot.data() as Exercise) : undefined;
}

/** Remove one exercise. Its takeaway and confidence live on the doc itself. */
export async function deleteExercise(id: string): Promise<void> {
  if (isE2EAuthBypass()) {
    await e2eDeleteDoc(COGI_COLLECTIONS.exercises, id);
    return;
  }
  await deleteDoc(userDocRef(COGI_COLLECTIONS.exercises, id));
}

export type CompletedExerciseFilter = {
  type?: ThinkingType | "all";
  domainContains?: string;
  completedAfter?: string;
  completedBefore?: string;
};

/** Completed exercises only, newest first; Firestore does the filter and the order. */
function completedQuery(limit?: number): RowQuery {
  return {
    where: { field: "completedAt", op: "!=", value: null },
    orderBy: { field: "completedAt", direction: "desc" },
    limit,
  };
}

/** Type, domain and date filters stay in the client, so no composite index is needed. */
function applyCompletedFilter(rows: Exercise[], filter?: CompletedExerciseFilter): Exercise[] {
  const f = filter ?? {};
  let next = rows;
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
  return next;
}

/** Completed exercises, newest first by `completedAt`. `limit` applies before the filter. */
export async function listCompletedExercises(
  filter?: CompletedExerciseFilter,
  limit?: number,
): Promise<Exercise[]> {
  const rows = await listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises, completedQuery(limit));
  return applyCompletedFilter(rows, filter);
}

export function subscribeCompletedExercises(
  filter: CompletedExerciseFilter | undefined,
  onData: (rows: Exercise[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<Exercise>(
    COGI_COLLECTIONS.exercises,
    (rows) => onData(applyCompletedFilter(rows, filter)),
    onError,
    completedQuery(),
  );
}

/**
 * Started but unfinished exercises of the types that can still be opened, newest first.
 * Rows of removed types are left out: their pages no longer exist.
 */
export async function listIncompleteExercises(): Promise<Exercise[]> {
  const rows = await listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises, {
    where: { field: "completedAt", op: "==", value: null },
  });
  const openable = new Set<string>(PRACTICE_EXERCISE_TYPES);
  return rows
    .filter((e) => (e.currentStep ?? 0) > 0 && openable.has(e.type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** How many recent exercises feed the domain suggestions. */
const RECENT_DOMAIN_WINDOW = 100;

/** Domains used most often (ties: most recent first) among recent exercises. */
export async function listRecentDomains(limit: number = 20): Promise<string[]> {
  const rows = await listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises, {
    orderBy: { field: "createdAt", direction: "desc" },
    limit: RECENT_DOMAIN_WINDOW,
  });
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
  return [...freq.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].latest.localeCompare(a[1].latest))
    .slice(0, limit)
    .map(([domain]) => domain);
}
