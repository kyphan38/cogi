import { writeBatch, type DocumentData } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/auth/firebase-client";
import {
  COGI_COLLECTIONS,
  listCollectionRows,
  type CogiCollectionName,
  userDocRef,
} from "@/lib/db/firestore";
import type { Exercise } from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import type { RealDecisionLogEntry } from "@/lib/types/decision";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import type { WeeklyReviewRow, DelayedRecallQueueRow } from "@/lib/types/insights";
import type { PerspectiveDisagreementRow } from "@/lib/types/disagreement";
import type { WeaknessEntry } from "@/lib/types/weakness";
import type { AppSettingsRow } from "@/lib/db/settings";

const EXPORT_VERSION = 1;

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
  journalEntries: unknown[];
  confidenceRecords: unknown[];
  actions: unknown[];
  decisions: unknown[];
  settings: unknown[];
  weeklyReviews: unknown[];
  delayedRecallQueue: unknown[];
  perspectiveDisagreements: unknown[];
  weaknesses?: unknown[];
};

/** Full backup from the signed-in user’s Firestore subcollections (not IndexedDB). */
export async function buildBackupPayload(): Promise<ThinkingBackupPayload> {
  const [
    exercises,
    journalEntries,
    confidenceRecords,
    actions,
    decisions,
    settings,
    weeklyReviews,
    delayedRecallQueue,
    perspectiveDisagreements,
    weaknesses,
  ] = await Promise.all([
    listCollectionRows<Exercise>(COGI_COLLECTIONS.exercises),
    listCollectionRows<JournalEntry>(COGI_COLLECTIONS.journalEntries),
    listCollectionRows<ConfidenceRecord>(COGI_COLLECTIONS.confidenceRecords),
    listCollectionRows<ActionBridge>(COGI_COLLECTIONS.actions),
    listCollectionRows<RealDecisionLogEntry>(COGI_COLLECTIONS.decisions),
    listCollectionRows<AppSettingsRow>(COGI_COLLECTIONS.settings),
    listCollectionRows<WeeklyReviewRow>(COGI_COLLECTIONS.weeklyReviews),
    listCollectionRows<DelayedRecallQueueRow>(COGI_COLLECTIONS.delayedRecallQueue),
    listCollectionRows<PerspectiveDisagreementRow>(COGI_COLLECTIONS.perspectiveDisagreements),
    listCollectionRows<WeaknessEntry>(COGI_COLLECTIONS.weaknesses),
  ]);
  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    journalEntries,
    confidenceRecords,
    actions,
    decisions,
    settings,
    weeklyReviews,
    delayedRecallQueue,
    perspectiveDisagreements,
    weaknesses,
  };
}

export async function exportAllJsonString(): Promise<string> {
  const p = await buildBackupPayload();
  return JSON.stringify(p, null, 2);
}

export async function exportJournalMarkdown(): Promise<string> {
  const entries = (await listCollectionRows<JournalEntry>(COGI_COLLECTIONS.journalEntries)).sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
  const lines: string[] = ["# Thinking journal", "", `Exported ${new Date().toISOString()}`, ""];
  for (const e of entries) {
    lines.push(`## Entry ${e.id}`, "");
    lines.push(`- Exercise: \`${e.exerciseId}\``);
    lines.push(`- Created: ${e.createdAt}`);
    if (e.emotionLabel) lines.push(`- Emotion: ${e.emotionLabel}`);
    lines.push("");
    if (e.aiReferenceLine) {
      lines.push(`> ${e.aiReferenceLine}`, "");
    }
    for (const pid of e.promptIds) {
      const text = e.responses[pid] ?? "";
      lines.push(`### ${pid}`, "", text, "");
    }
    lines.push("---", "");
  }
  return lines.join("\n");
}

export type ImportMode = "merge" | "replace";

/**
 * Import backup JSON into Firestore for the signed-in user.
 * `replace` deletes existing rows in each affected subcollection before writing (destructive).
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
    await Promise.all([
      commitDeletesInChunks(COGI_COLLECTIONS.exercises),
      commitDeletesInChunks(COGI_COLLECTIONS.journalEntries),
      commitDeletesInChunks(COGI_COLLECTIONS.confidenceRecords),
      commitDeletesInChunks(COGI_COLLECTIONS.actions),
      commitDeletesInChunks(COGI_COLLECTIONS.decisions),
      commitDeletesInChunks(COGI_COLLECTIONS.settings),
      commitDeletesInChunks(COGI_COLLECTIONS.weeklyReviews),
      commitDeletesInChunks(COGI_COLLECTIONS.delayedRecallQueue),
      commitDeletesInChunks(COGI_COLLECTIONS.perspectiveDisagreements),
      commitDeletesInChunks(COGI_COLLECTIONS.weaknesses),
    ]);
  }

  if (Array.isArray(parsed.exercises) && parsed.exercises.length) {
    await commitSetsInChunks(COGI_COLLECTIONS.exercises, parsed.exercises as DocumentData[]);
  }
  if (Array.isArray(parsed.journalEntries) && parsed.journalEntries.length) {
    await commitSetsInChunks(COGI_COLLECTIONS.journalEntries, parsed.journalEntries as DocumentData[]);
  }
  if (Array.isArray(parsed.confidenceRecords) && parsed.confidenceRecords.length) {
    await commitSetsInChunks(
      COGI_COLLECTIONS.confidenceRecords,
      parsed.confidenceRecords as DocumentData[],
    );
  }
  if (Array.isArray(parsed.actions) && parsed.actions.length) {
    await commitSetsInChunks(COGI_COLLECTIONS.actions, parsed.actions as DocumentData[]);
  }
  if (Array.isArray(parsed.decisions) && parsed.decisions.length) {
    await commitSetsInChunks(COGI_COLLECTIONS.decisions, parsed.decisions as DocumentData[]);
  }
  if (Array.isArray(parsed.settings) && parsed.settings.length) {
    await commitSetsInChunks(COGI_COLLECTIONS.settings, parsed.settings as DocumentData[]);
  }
  if (Array.isArray(parsed.weeklyReviews) && parsed.weeklyReviews.length) {
    await commitSetsInChunks(COGI_COLLECTIONS.weeklyReviews, parsed.weeklyReviews as DocumentData[]);
  }
  if (Array.isArray(parsed.delayedRecallQueue) && parsed.delayedRecallQueue.length) {
    await commitSetsInChunks(
      COGI_COLLECTIONS.delayedRecallQueue,
      parsed.delayedRecallQueue as DocumentData[],
    );
  }
  if (Array.isArray(parsed.perspectiveDisagreements) && parsed.perspectiveDisagreements.length) {
    await commitSetsInChunks(
      COGI_COLLECTIONS.perspectiveDisagreements,
      parsed.perspectiveDisagreements as DocumentData[],
    );
  }
  if (Array.isArray(parsed.weaknesses) && parsed.weaknesses.length) {
    await commitSetsInChunks(COGI_COLLECTIONS.weaknesses, parsed.weaknesses as DocumentData[]);
  }
}
