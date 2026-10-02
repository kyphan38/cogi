import { writeBatch, type DocumentData } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/auth/firebase-client";
import {
  COGI_COLLECTIONS,
  listCollectionRows,
  type CogiCollectionName,
  userDocRef,
} from "@/lib/db/firestore";
/** v2: only the collections the app still uses. v1 files import fine; extra keys are ignored. */
const EXPORT_VERSION = 2;

/** What a backup holds, in export and import order. */
const BACKUP_COLLECTIONS = [
  COGI_COLLECTIONS.exercises,
  COGI_COLLECTIONS.settings,
  COGI_COLLECTIONS.practicedTopics,
] as const;

const BATCH_MAX = 400;

async function commitDeletesInChunks(collectionName: CogiCollectionName): Promise<void> {
  const rows = await listCollectionRows<{ id: string }>(collectionName);
  const db = getFirebaseFirestore();
  let batch = writeBatch(db);
  let count = 0;
  for (const row of rows) {
    batch.delete(userDocRef(collectionName, row.id));
    count++;
    if (count >= BATCH_MAX) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
}

async function commitSetsInChunks(
  collectionName: CogiCollectionName,
  rows: DocumentData[],
): Promise<void> {
  const db = getFirebaseFirestore();
  let batch = writeBatch(db);
  let count = 0;
  for (const row of rows) {
    const rawId = row.id;
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (!id) continue;
    batch.set(userDocRef(collectionName, id), row as never);
    count++;
    if (count >= BATCH_MAX) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
}

export type ThinkingBackupPayload = {
  exportVersion: number;
  exportedAt: string;
  exercises: unknown[];
  settings: unknown[];
  practicedTopics?: unknown[];
};

/** Full backup from the signed-in user's Firestore subcollections. */
export async function buildBackupPayload(): Promise<ThinkingBackupPayload> {
  const [exercises, settings, practicedTopics] = await Promise.all(
    BACKUP_COLLECTIONS.map((name) => listCollectionRows(name)),
  );
  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    settings,
    practicedTopics,
  };
}

export async function exportAllJsonString(): Promise<string> {
  const p = await buildBackupPayload();
  return JSON.stringify(p, null, 2);
}

export type ImportMode = "merge" | "replace";

/**
 * Import backup JSON into Firestore for the signed-in user.
 * `replace` deletes existing rows in each backed-up collection before writing (destructive).
 */
export async function importBackupJson(jsonStr: string, mode: ImportMode): Promise<void> {
  let parsed: ThinkingBackupPayload;
  try {
    parsed = JSON.parse(jsonStr) as ThinkingBackupPayload;
  } catch {
    throw new Error("File is not valid JSON");
  }
  if (typeof parsed.exportVersion !== "number") {
    throw new Error("Unrecognized backup format (missing exportVersion)");
  }

  if (mode === "replace") {
    await Promise.all(BACKUP_COLLECTIONS.map((name) => commitDeletesInChunks(name)));
  }

  for (const name of BACKUP_COLLECTIONS) {
    const rows = (parsed as Record<string, unknown>)[name];
    if (Array.isArray(rows) && rows.length) {
      await commitSetsInChunks(name, rows as DocumentData[]);
    }
  }
}
