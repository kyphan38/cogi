import { Unsubscribe, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { DelayedRecallQueueRow } from "@/lib/types/insights";

/** Oldest pending recall that is due (dueAt <= now). */
export async function getNextDueRecall(): Promise<DelayedRecallQueueRow | undefined> {
  const now = new Date().toISOString();
  const pending = (await listCollectionRows<DelayedRecallQueueRow>(COGI_COLLECTIONS.delayedRecallQueue))
    .filter((row) => row.status === "pending");
  const due = pending
    .filter((r) => r.dueAt <= now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return due[0];
}

export async function updateRecallRow(row: DelayedRecallQueueRow): Promise<void> {
  await setDoc(userDocRef<DelayedRecallQueueRow>(COGI_COLLECTIONS.delayedRecallQueue, row.id), row);
}

export function subscribeNextDueRecall(
  onData: (row: DelayedRecallQueueRow | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<DelayedRecallQueueRow>(
    COGI_COLLECTIONS.delayedRecallQueue,
    (rows) => {
      const now = new Date().toISOString();
      const due = rows
        .filter((row) => row.status === "pending" && row.dueAt <= now)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
      onData(due ?? null);
    },
    onError,
  );
}
