import { Unsubscribe, getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, subscribeCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { WeeklyReviewRow } from "@/lib/types/insights";

export async function putWeeklyReview(row: WeeklyReviewRow): Promise<void> {
  await setDoc(userDocRef<WeeklyReviewRow>(COGI_COLLECTIONS.weeklyReviews, row.id), row);
}

export async function listWeeklyReviewsNewestFirst(): Promise<WeeklyReviewRow[]> {
  const rows = await listCollectionRows<WeeklyReviewRow>(COGI_COLLECTIONS.weeklyReviews);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLatestWeeklyReview(): Promise<WeeklyReviewRow | undefined> {
  const list = await listWeeklyReviewsNewestFirst();
  return list[0];
}

export function subscribeWeeklyReviewsNewestFirst(
  onData: (rows: WeeklyReviewRow[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return subscribeCollectionRows<WeeklyReviewRow>(
    COGI_COLLECTIONS.weeklyReviews,
    (rows) => onData(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    onError,
  );
}
