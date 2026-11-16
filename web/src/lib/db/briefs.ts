import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import { BRIEFS_KEPT, type Brief } from "@/lib/briefs/schema";

/** One doc in the settings collection, so the Firestore rules need no new collection. */
const BRIEFS_ID = "briefs";

interface BriefsRow {
  id: typeof BRIEFS_ID;
  briefs: Brief[];
}

/** Saved briefs, newest first. */
export async function getBriefs(): Promise<Brief[]> {
  const row = isE2EAuthBypass()
    ? await e2eGetDoc<BriefsRow>(COGI_COLLECTIONS.settings, BRIEFS_ID)
    : await getDoc(userDocRef<BriefsRow>(COGI_COLLECTIONS.settings, BRIEFS_ID)).then((s) => (s.exists() ? s.data() : undefined));
  return [...(row?.briefs ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Save the whole list, newest first, keeping only the newest `BRIEFS_KEPT`. */
export async function setBriefs(briefs: Brief[]): Promise<Brief[]> {
  const kept = [...briefs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, BRIEFS_KEPT);
  const row = stripUndefinedDeep({ id: BRIEFS_ID, briefs: kept }) as BriefsRow;
  if (isE2EAuthBypass()) await e2eSetDoc(COGI_COLLECTIONS.settings, BRIEFS_ID, row as unknown as Record<string, unknown>);
  else await setDoc(userDocRef<BriefsRow>(COGI_COLLECTIONS.settings, BRIEFS_ID), row);
  return kept;
}
