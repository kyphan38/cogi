import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import type { AdaptiveTracksDoc } from "@/lib/tracks/adaptive";

/**
 * One doc in the settings collection, so the Firestore rules need no new collection.
 * Its own doc because `getAppSettings()` drops fields it does not know.
 */
const ADAPTIVE_TRACKS_ID = "adaptiveTracks";

const EMPTY: AdaptiveTracksDoc = { id: ADAPTIVE_TRACKS_ID, current: null, past: [] };

export async function getAdaptiveTracks(): Promise<AdaptiveTracksDoc> {
  const row = isE2EAuthBypass()
    ? await e2eGetDoc<AdaptiveTracksDoc>(COGI_COLLECTIONS.settings, ADAPTIVE_TRACKS_ID)
    : await getDoc(userDocRef<AdaptiveTracksDoc>(COGI_COLLECTIONS.settings, ADAPTIVE_TRACKS_ID)).then((s) =>
        s.exists() ? s.data() : undefined,
      );
  return { ...EMPTY, current: row?.current ?? null, past: row?.past ?? [] };
}

export async function setAdaptiveTracks(doc: Omit<AdaptiveTracksDoc, "id">): Promise<void> {
  const row = stripUndefinedDeep({ ...doc, id: ADAPTIVE_TRACKS_ID }) as AdaptiveTracksDoc;
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.settings, ADAPTIVE_TRACKS_ID, row as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<AdaptiveTracksDoc>(COGI_COLLECTIONS.settings, ADAPTIVE_TRACKS_ID), row);
}
