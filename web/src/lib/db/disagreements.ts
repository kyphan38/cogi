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

/** Distinct (exercise, section, point) discussed - a multi-round discussion on one point counts once. */
function countDistinctPoints(rows: PerspectiveDisagreementRow[]): number {
  const keys = new Set(rows.map((r) => `${r.exerciseId}:${r.section}:${r.pointId}`));
  return keys.size;
}

export async function countPerspectiveDisagreementsForExercises(
  exerciseIds: Set<string>,
): Promise<number> {
  const rows = await listCollectionRows<PerspectiveDisagreementRow>(
    COGI_COLLECTIONS.perspectiveDisagreements,
  );
  return countDistinctPoints(rows.filter((row) => exerciseIds.has(row.exerciseId)));
}

export function subscribePerspectiveDisagreementCount(
  onData: (count: number) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<PerspectiveDisagreementRow>(
    COGI_COLLECTIONS.perspectiveDisagreements,
    (rows) => onData(countDistinctPoints(rows)),
    onError,
  );
}
