import { Unsubscribe, writeBatch, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/auth/firebase-client";
import { COGI_COLLECTIONS, listCollectionRows, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { DelayedRecallQueueRow } from "@/lib/types/insights";

const STALE_PENDING_DAYS = 7;

/** Pending rows with dueAt older than this ISO string are auto-expired on dashboard load. */
function stalePendingDueCutoffIso(nowMs: number): string {
  return new Date(nowMs - STALE_PENDING_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

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

/**
 * Marks very old pending recall rows as expired so the queue does not grow forever
 * when the user never opens the dashboard.
 */
export async function expireStalePendingRecalls(nowMs: number = Date.now()): Promise<void> {
  const cutoff = stalePendingDueCutoffIso(nowMs);
  const pending = (await listCollectionRows<DelayedRecallQueueRow>(COGI_COLLECTIONS.delayedRecallQueue)).filter(
    (row) => row.status === "pending" && row.dueAt < cutoff,
  );
  if (pending.length === 0) return;

  const nowIso = new Date(nowMs).toISOString();
  const db = getFirebaseFirestore();
  const BATCH_LIMIT = 400;
  for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
    const chunk = pending.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const row of chunk) {
      const ref = userDocRef<DelayedRecallQueueRow>(COGI_COLLECTIONS.delayedRecallQueue, row.id);
      batch.set(ref, {
        ...row,
        status: "expired",
        expiredAt: nowIso,
      });
    }
    await batch.commit();
  }
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
