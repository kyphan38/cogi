import { getDb } from "@/lib/db/schema";
import type { DelayedRecallQueueRow } from "@/lib/types/insights";

/** Oldest pending recall that is due (dueAt <= now). */
export async function getNextDueRecall(): Promise<DelayedRecallQueueRow | undefined> {
  const now = new Date().toISOString();
  const pending = await getDb().delayedRecallQueue.where("status").equals("pending").toArray();
  const due = pending
    .filter((r) => r.dueAt <= now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return due[0];
}

export async function updateRecallRow(row: DelayedRecallQueueRow): Promise<void> {
  await getDb().delayedRecallQueue.put(row);
}
