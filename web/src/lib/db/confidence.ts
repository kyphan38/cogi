import { getDb } from "@/lib/db/schema";
import type { ConfidenceRecord } from "@/lib/types/exercise";

export async function putConfidenceRecord(row: ConfidenceRecord): Promise<void> {
  await getDb().confidenceRecords.put(row);
}
