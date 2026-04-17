import { getDb } from "@/lib/db/schema";
import type { PerspectiveDisagreementRow } from "@/lib/types/disagreement";

export async function putPerspectiveDisagreement(
  row: PerspectiveDisagreementRow,
): Promise<void> {
  await getDb().perspectiveDisagreements.put(row);
}

export async function listPerspectiveDisagreementsForExercise(
  exerciseId: string,
): Promise<PerspectiveDisagreementRow[]> {
  return getDb().perspectiveDisagreements.where("exerciseId").equals(exerciseId).toArray();
}
