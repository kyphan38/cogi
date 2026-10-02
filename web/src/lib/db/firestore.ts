import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  QueryConstraint,
  Unsubscribe,
  collection,
  doc,
  getDocs,
  limit as limitTo,
  onSnapshot,
  orderBy as orderByField,
  query,
  where,
} from "firebase/firestore";
import { getCurrentUidOrThrow, getFirebaseFirestore } from "@/lib/auth/firebase-client";
import {
  e2eListCollectionRows,
  e2eSubscribeCollectionRows,
  isE2EAuthBypass,
} from "@/lib/db/e2e-firestore-memory";

/** Collections the client reads and writes; keep in sync with firestore.rules. */
export const COGI_COLLECTIONS = {
  cachedTopicLists: "cachedTopicLists",
  exercises: "exercises",
  practicedTopics: "practicedTopics",
  settings: "settings",
} as const;

export type CogiCollectionName = (typeof COGI_COLLECTIONS)[keyof typeof COGI_COLLECTIONS];

export function userCollectionRef<T extends DocumentData = DocumentData>(
  collectionName: CogiCollectionName,
): CollectionReference<T> {
  const uid = getCurrentUidOrThrow();
  return collection(getFirebaseFirestore(), "users", uid, collectionName) as CollectionReference<T>;
}

export function userDocRef<T extends DocumentData = DocumentData>(
  collectionName: CogiCollectionName,
  docId: string,
): DocumentReference<T> {
  const uid = getCurrentUidOrThrow();
  return doc(getFirebaseFirestore(), "users", uid, collectionName, docId) as DocumentReference<T>;
}

/**
 * A small query shape that runs on Firestore and, for E2E, on the in-memory store.
 * Only single-field filters plus an order on the same field, so no composite index.
 */
export type RowQuery = {
  where?: { field: string; op: "==" | "!="; value: unknown };
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
};

function toConstraints(q: RowQuery | undefined): QueryConstraint[] {
  if (!q) return [];
  const out: QueryConstraint[] = [];
  if (q.where) out.push(where(q.where.field, q.where.op, q.where.value));
  if (q.orderBy) out.push(orderByField(q.orderBy.field, q.orderBy.direction));
  if (q.limit != null) out.push(limitTo(q.limit));
  return out;
}

/** The same query applied in JS, for the E2E in-memory store. */
export function applyRowQuery<T>(rows: T[], q: RowQuery | undefined): T[] {
  if (!q) return rows;
  let out = rows;
  const w = q.where;
  if (w) {
    out = out.filter((r) => {
      const v = (r as Record<string, unknown>)[w.field] ?? null;
      return w.op === "==" ? v === w.value : v !== w.value;
    });
  }
  const o = q.orderBy;
  if (o) {
    const sign = o.direction === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[o.field] ?? "");
      const bv = String((b as Record<string, unknown>)[o.field] ?? "");
      return av.localeCompare(bv) * sign;
    });
  }
  return q.limit != null ? out.slice(0, q.limit) : out;
}

export function subscribeCollectionRows<T extends { id: string }>(
  collectionName: CogiCollectionName,
  onData: (rows: T[]) => void,
  onError?: (error: unknown) => void,
  rowQuery?: RowQuery,
): Unsubscribe {
  if (isE2EAuthBypass()) {
    return e2eSubscribeCollectionRows<T>(collectionName, (rows) => onData(applyRowQuery(rows, rowQuery)));
  }
  return onSnapshot(
    query(userCollectionRef<T>(collectionName), ...toConstraints(rowQuery)),
    (snapshot) => {
      const rows = snapshot.docs.map((row) => ({ id: row.id, ...(row.data() as Omit<T, "id">) }));
      onData(rows as T[]);
    },
    (error) => onError?.(error),
  );
}

export async function listCollectionRows<T extends { id: string }>(
  collectionName: CogiCollectionName,
  rowQuery?: RowQuery,
): Promise<T[]> {
  if (isE2EAuthBypass()) {
    return applyRowQuery(await e2eListCollectionRows<T>(collectionName), rowQuery);
  }
  const snapshot = await getDocs(query(userCollectionRef<T>(collectionName), ...toConstraints(rowQuery)));
  return snapshot.docs.map((row) => ({ id: row.id, ...(row.data() as Omit<T, "id">) })) as T[];
}

export function logFirestoreQueryError(
  source: string,
  operation: string,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code;
  const maybeMissingIndex =
    code === "failed-precondition" ||
    message.toLowerCase().includes("index") ||
    message.toLowerCase().includes("failed-precondition");

  console.error("[firestore-query-error]", {
    source,
    operation,
    code: code ?? null,
    message,
  });

  if (maybeMissingIndex) {
    console.error(
      "[firestore-index-hint] A composite index may be missing. Check browser console logs for the Firebase index creation URL.",
    );
  }
}
