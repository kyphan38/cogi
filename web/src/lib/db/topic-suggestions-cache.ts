import { getDoc, setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, userDocRef } from "@/lib/db/firestore";
import { e2eGetDoc, e2eSetDoc, isE2EAuthBypass } from "@/lib/db/e2e-firestore-memory";
import { stripUndefinedDeep } from "@/lib/db/strip-undefined-deep";
import type { CachedTopicList } from "@/lib/types/topic-suggestion-cache";
import type { PracticedTopicArea } from "@/lib/types/practiced-topic";

function cacheId(kind: "exercise" | "math", area: PracticedTopicArea): string {
  return `${kind}:${area}`;
}

export async function getCachedTopicList(
  kind: "exercise" | "math",
  area: PracticedTopicArea,
): Promise<CachedTopicList | undefined> {
  const id = cacheId(kind, area);
  if (isE2EAuthBypass()) {
    return e2eGetDoc<CachedTopicList>(COGI_COLLECTIONS.cachedTopicLists, id);
  }
  const snapshot = await getDoc(userDocRef<CachedTopicList>(COGI_COLLECTIONS.cachedTopicLists, id));
  return snapshot.exists() ? (snapshot.data() as CachedTopicList) : undefined;
}

export async function putCachedTopicList(row: CachedTopicList): Promise<void> {
  const data = stripUndefinedDeep(row) as CachedTopicList;
  if (isE2EAuthBypass()) {
    await e2eSetDoc(COGI_COLLECTIONS.cachedTopicLists, row.id, data as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(userDocRef<CachedTopicList>(COGI_COLLECTIONS.cachedTopicLists, row.id), data);
}
