import { setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import type { ConfidenceRecord } from "@/lib/types/exercise";

export async function putConfidenceRecord(row: ConfidenceRecord): Promise<void> {
  await setDoc(userDocRef<ConfidenceRecord>(COGI_COLLECTIONS.confidenceRecords, row.id), row);
}
