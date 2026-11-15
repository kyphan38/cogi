import "server-only";

import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { nextAiUsage, AI_DAILY_LIMIT } from "@/lib/ai/daily-limit-core";

/**
 * Counts one AI call for today and says whether it is allowed.
 * Stored in Firestore (users/{uid}/meta/aiUsage): serverless instances share no memory.
 * The client cannot read or reset it, because firestore.rules only allow a fixed list of collections.
 */
export async function takeAiCall(uid: string, now = Date.now()): Promise<boolean> {
  const ref = getFirebaseAdminDb().doc(`users/${uid}/meta/aiUsage`);
  return getFirebaseAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = nextAiUsage(snap.data(), now, AI_DAILY_LIMIT);
    if (next.allowed) tx.set(ref, next.usage);
    return next.allowed;
  });
}
