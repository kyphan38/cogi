import { getDb } from "@/lib/db/schema";
import type { WeeklyReviewRow } from "@/lib/types/insights";

export async function putWeeklyReview(row: WeeklyReviewRow): Promise<void> {
  await getDb().weeklyReviews.put(row);
}

export async function listWeeklyReviewsNewestFirst(): Promise<WeeklyReviewRow[]> {
  const rows = await getDb().weeklyReviews.toArray();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLatestWeeklyReview(): Promise<WeeklyReviewRow | undefined> {
  const list = await listWeeklyReviewsNewestFirst();
  return list[0];
}
