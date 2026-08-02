import { deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, userDocRef } from "@/lib/db/firestore";
import { e2eDeleteDoc, e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import type { ActiveMathSession } from "@/lib/types/math-session";

export async function getActiveMathSession(id: string): Promise<ActiveMathSession | undefined> {
  if (isE2EAuthBypass()) {
    return e2eGetDoc<ActiveMathSession>(COGI_COLLECTIONS.activeMathSessions, id);
  }
  const snapshot = await getDoc(userDocRef<ActiveMathSession>(COGI_COLLECTIONS.activeMathSessions, id));
  return snapshot.exists() ? (snapshot.data() as ActiveMathSession) : undefined;
}

export async function putActiveMathSession(row: ActiveMathSession): Promise<void> {
  const data = stripUndefinedDeep(row) as ActiveMathSession;
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.activeMathSessions, row.id, data as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<ActiveMathSession>(COGI_COLLECTIONS.activeMathSessions, row.id), data);
}

export async function deleteActiveMathSession(id: string): Promise<void> {
  if (isE2EAuthBypass()) {
    await e2eDeleteDoc(COGI_COLLECTIONS.activeMathSessions, id);
    return;
  }
  await deleteDoc(userDocRef(COGI_COLLECTIONS.activeMathSessions, id));
}

/** In-progress Math scenarios, newest first. */
export async function listActiveMathSessions(): Promise<ActiveMathSession[]> {
  const all = await listCollectionRows<ActiveMathSession>(COGI_COLLECTIONS.activeMathSessions);
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
