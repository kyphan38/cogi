import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import type { TermReviewStates } from "@/lib/exercise/term-review";

/**
 * Review state for "My terms" (PLAN-retention.md R2): one small doc in `settings`, so
 * no new collection or rule. Its own doc, because getAppSettings() drops fields it
 * does not know and would wipe this on the next settings save.
 */
interface TermReviewRow {
  id: "termReview";
  states: TermReviewStates;
}

const DOC_ID = "termReview" as const;

export async function getTermReviewStates(): Promise<TermReviewStates> {
  if (isE2EAuthBypass()) {
    return (await e2eGetDoc<TermReviewRow>(COGI_COLLECTIONS.settings, DOC_ID))?.states ?? {};
  }
  const snap = await getDoc(userDocRef<TermReviewRow>(COGI_COLLECTIONS.settings, DOC_ID));
  return snap.exists() ? ((snap.data() as TermReviewRow).states ?? {}) : {};
}

export async function saveTermReviewStates(states: TermReviewStates): Promise<void> {
  const row: TermReviewRow = { id: DOC_ID, states };
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.settings, DOC_ID, row as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<TermReviewRow>(COGI_COLLECTIONS.settings, DOC_ID), row);
}
