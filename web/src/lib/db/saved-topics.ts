import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import type { SavedTopic } from "@/lib/topics/saved-topics";

/** One doc in the settings collection, so the Firestore rules need no new collection. */
const SAVED_TOPICS_ID = "savedTopics";

interface SavedTopicsRow {
  id: typeof SAVED_TOPICS_ID;
  topics: SavedTopic[];
}

export async function getSavedTopics(): Promise<SavedTopic[]> {
  if (isE2EAuthBypass()) {
    return (await e2eGetDoc<SavedTopicsRow>(COGI_COLLECTIONS.settings, SAVED_TOPICS_ID))?.topics ?? [];
  }
  const snapshot = await getDoc(userDocRef<SavedTopicsRow>(COGI_COLLECTIONS.settings, SAVED_TOPICS_ID));
  return snapshot.exists() ? (snapshot.data().topics ?? []) : [];
}

export async function setSavedTopics(topics: SavedTopic[]): Promise<void> {
  const row = stripUndefinedDeep({ id: SAVED_TOPICS_ID, topics }) as SavedTopicsRow;
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.settings, SAVED_TOPICS_ID, row as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<SavedTopicsRow>(COGI_COLLECTIONS.settings, SAVED_TOPICS_ID), row);
}
