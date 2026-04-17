import { Unsubscribe, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { PerspectiveDisagreementRow } from "@/lib/types/disagreement";

export async function putPerspectiveDisagreement(
  row: PerspectiveDisagreementRow,
): Promise<void> {
  await setDoc(
    userDocRef<PerspectiveDisagreementRow>(COGI_COLLECTIONS.perspectiveDisagreements, row.id),
    row,
  );
}

export async function listPerspectiveDisagreementsForExercise(
  exerciseId: string,
): Promise<PerspectiveDisagreementRow[]> {
  const rows = await listCollectionRows<PerspectiveDisagreementRow>(
    COGI_COLLECTIONS.perspectiveDisagreements,
  );
  return rows.filter((row) => row.exerciseId === exerciseId);
}

export async function countPerspectiveDisagreementsForExercises(
  exerciseIds: Set<string>,
): Promise<number> {
  const rows = await listCollectionRows<PerspectiveDisagreementRow>(
    COGI_COLLECTIONS.perspectiveDisagreements,
  );
  return rows.filter((row) => exerciseIds.has(row.exerciseId)).length;
}

export function subscribePerspectiveDisagreementCount(
  onData: (count: number) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<PerspectiveDisagreementRow>(
    COGI_COLLECTIONS.perspectiveDisagreements,
    (rows) => onData(rows.length),
    onError,
  );
}
