import { getDb } from "@/lib/db/schema";
import type { RealDecisionLogEntry } from "@/lib/types/decision";

export async function listDecisions(): Promise<RealDecisionLogEntry[]> {
  return getDb()
    .decisions.orderBy("decidedAt")
    .reverse()
    .toArray();
}

export async function putDecision(row: RealDecisionLogEntry): Promise<void> {
  await getDb().decisions.put(row);
}

export async function deleteDecision(id: string): Promise<void> {
  await getDb().decisions.delete(id);
}

export async function getDecision(
  id: string,
): Promise<RealDecisionLogEntry | undefined> {
  return getDb().decisions.get(id);
}
