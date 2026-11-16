import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import type { MonthlyReview } from "@/lib/monthly/stats";

/** One doc in the settings collection, so the Firestore rules need no new collection. */
const REVIEWS_ID = "monthlyReviews";

interface ReviewsRow {
  id: typeof REVIEWS_ID;
  reviews: MonthlyReview[];
}

/** Saved reviews, newest month first. */
export async function getMonthlyReviews(): Promise<MonthlyReview[]> {
  const row = isE2EAuthBypass()
    ? await e2eGetDoc<ReviewsRow>(COGI_COLLECTIONS.settings, REVIEWS_ID)
    : await getDoc(userDocRef<ReviewsRow>(COGI_COLLECTIONS.settings, REVIEWS_ID)).then((s) => (s.exists() ? s.data() : undefined));
  return [...(row?.reviews ?? [])].sort((a, b) => b.month.localeCompare(a.month));
}

/** Add a review, replacing an older one for the same month. */
export async function saveMonthlyReview(review: MonthlyReview): Promise<MonthlyReview[]> {
  const others = (await getMonthlyReviews()).filter((r) => r.month !== review.month);
  const reviews = [review, ...others].sort((a, b) => b.month.localeCompare(a.month));
  const row = stripUndefinedDeep({ id: REVIEWS_ID, reviews }) as ReviewsRow;
  if (isE2EAuthBypass()) await e2eSetDoc(COGI_COLLECTIONS.settings, REVIEWS_ID, row as unknown as Record<string, unknown>);
  else await setDoc(userDocRef<ReviewsRow>(COGI_COLLECTIONS.settings, REVIEWS_ID), row);
  return reviews;
}
