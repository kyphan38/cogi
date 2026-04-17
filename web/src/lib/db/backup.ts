import { getDb } from "@/lib/db/schema";

const EXPORT_VERSION = 1;

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

export async function buildBackupPayload(): Promise<ThinkingBackupPayload> {
  const db = getDb();
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
    db.exercises.toArray(),
    db.journalEntries.toArray(),
    db.confidenceRecords.toArray(),
    db.actions.toArray(),
    db.decisions.toArray(),
    db.settings.toArray(),
    db.weeklyReviews.toArray(),
    db.delayedRecallQueue.toArray(),
    db.perspectiveDisagreements.toArray(),
    db.weaknesses.toArray(),
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
  const db = getDb();
  const entries = await db.journalEntries.orderBy("createdAt").toArray();
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

/** Import backup JSON. `replace` clears listed tables first. */
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
  const db = getDb();
  const tables = [
    db.exercises,
    db.journalEntries,
    db.confidenceRecords,
    db.actions,
    db.decisions,
    db.settings,
    db.weeklyReviews,
    db.delayedRecallQueue,
    db.perspectiveDisagreements,
    db.weaknesses,
  ] as const;

  const run = async () => {
    if (mode === "replace") {
      await Promise.all([
        db.exercises.clear(),
        db.journalEntries.clear(),
        db.confidenceRecords.clear(),
        db.actions.clear(),
        db.decisions.clear(),
        db.settings.clear(),
        db.weeklyReviews.clear(),
        db.delayedRecallQueue.clear(),
        db.perspectiveDisagreements.clear(),
        db.weaknesses.clear(),
      ]);
    }
    if (Array.isArray(parsed.exercises) && parsed.exercises.length) {
      await db.exercises.bulkPut(parsed.exercises as never[]);
    }
    if (Array.isArray(parsed.journalEntries) && parsed.journalEntries.length) {
      await db.journalEntries.bulkPut(parsed.journalEntries as never[]);
    }
    if (Array.isArray(parsed.confidenceRecords) && parsed.confidenceRecords.length) {
      await db.confidenceRecords.bulkPut(parsed.confidenceRecords as never[]);
    }
    if (Array.isArray(parsed.actions) && parsed.actions.length) {
      await db.actions.bulkPut(parsed.actions as never[]);
    }
    if (Array.isArray(parsed.decisions) && parsed.decisions.length) {
      await db.decisions.bulkPut(parsed.decisions as never[]);
    }
    if (Array.isArray(parsed.settings) && parsed.settings.length) {
      await db.settings.bulkPut(parsed.settings as never[]);
    }
    if (Array.isArray(parsed.weeklyReviews) && parsed.weeklyReviews.length) {
      await db.weeklyReviews.bulkPut(parsed.weeklyReviews as never[]);
    }
    if (Array.isArray(parsed.delayedRecallQueue) && parsed.delayedRecallQueue.length) {
      await db.delayedRecallQueue.bulkPut(parsed.delayedRecallQueue as never[]);
    }
    if (
      Array.isArray(parsed.perspectiveDisagreements) &&
      parsed.perspectiveDisagreements.length
    ) {
      await db.perspectiveDisagreements.bulkPut(parsed.perspectiveDisagreements as never[]);
    }
    if (Array.isArray(parsed.weaknesses) && parsed.weaknesses.length) {
      await db.weaknesses.bulkPut(parsed.weaknesses as never[]);
    }
  };

  await db.transaction("rw", tables, run);
}
