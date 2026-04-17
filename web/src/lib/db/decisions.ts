import { Unsubscribe, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { RealDecisionLogEntry } from "@/lib/types/decision";

export async function listDecisions(): Promise<RealDecisionLogEntry[]> {
  const rows = await listCollectionRows<RealDecisionLogEntry>(COGI_COLLECTIONS.decisions);
  return rows.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
}

export function subscribeDecisions(
  onData: (rows: RealDecisionLogEntry[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<RealDecisionLogEntry>(
    COGI_COLLECTIONS.decisions,
    (rows) => onData(rows.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))),
    onError,
  );
}

export async function putDecision(row: RealDecisionLogEntry): Promise<void> {
  await setDoc(userDocRef<RealDecisionLogEntry>(COGI_COLLECTIONS.decisions, row.id), row);
}

export async function deleteDecision(id: string): Promise<void> {
  await deleteDoc(userDocRef(COGI_COLLECTIONS.decisions, id));
}

export async function getDecision(
  id: string,
): Promise<RealDecisionLogEntry | undefined> {
  const snapshot = await getDoc(userDocRef<RealDecisionLogEntry>(COGI_COLLECTIONS.decisions, id));
  return snapshot.exists() ? (snapshot.data() as RealDecisionLogEntry) : undefined;
}
