import { collection, getDocs } from "firebase/firestore";

import type { MonthCost } from "@/lib/ai-cost";
import { getFirebaseFirestore } from "@/lib/auth/firebase-client";
import { isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";

/** Every month in aiUsage/{YYYY-MM} (one small doc a month). The server writes them. */
export async function loadAiCosts(): Promise<MonthCost[]> {
  // E2E runs have no Firestore.
  if (isE2EAuthBypass()) return [];
  const snap = await getDocs(collection(getFirebaseFirestore(), "aiUsage"));
  return snap.docs.map((d) => ({ month: d.id, usd: Number(d.data().usd ?? 0) }));
}
