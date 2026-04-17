import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  Unsubscribe,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
} from "firebase/firestore";
import { getCurrentUidOrThrow, getFirebaseFirestore } from "@/lib/auth/firebase-client";

export const COGI_COLLECTIONS = {
  actions: "actions",
  aiArtifacts: "aiArtifacts",
  confidenceRecords: "confidenceRecords",
  decisions: "decisions",
  delayedRecallQueue: "delayedRecallQueue",
  exercises: "exercises",
  journalEntries: "journalEntries",
  perspectiveDisagreements: "perspectiveDisagreements",
  settings: "settings",
  weaknesses: "weaknesses",
  weeklyReviews: "weeklyReviews",
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

export function subscribeCollectionRows<T extends { id: string }>(
  collectionName: CogiCollectionName,
  onData: (rows: T[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(userCollectionRef<T>(collectionName)),
    (snapshot) => {
      const rows = snapshot.docs.map((row) => ({ id: row.id, ...(row.data() as Omit<T, "id">) }));
      onData(rows as T[]);
    },
    (error) => onError?.(error),
  );
}

export async function listCollectionRows<T extends { id: string }>(
  collectionName: CogiCollectionName,
): Promise<T[]> {
  const snapshot = await getDocs(query(userCollectionRef<T>(collectionName)));
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
