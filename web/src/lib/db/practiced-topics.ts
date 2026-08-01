import { setDoc } from "firebase/firestore";
import { COGI_COLLECTIONS, listCollectionRows, userDocRef } from "@/lib/db/firestore";
import type { PracticedTopicArea, PracticedTopicEntry } from "@/lib/types/practiced-topic";

export function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

async function findRow(
  area: PracticedTopicArea,
  titleKey: string,
): Promise<PracticedTopicEntry | undefined> {
  const rows = (await listCollectionRows<PracticedTopicEntry>(COGI_COLLECTIONS.practicedTopics))
    .filter((row) => row.area === area);
  return rows.find((r) => r.titleKey === titleKey);
}

/** Upsert a completed topic so future suggestion calls for this area can exclude it. */
export async function recordPracticedTopic(input: {
  area: PracticedTopicArea;
  title: string;
  origin: "suggested" | "manual";
}): Promise<void> {
  const titleKey = normalizeTitleKey(input.title);
  if (!titleKey) return;
  const existing = await findRow(input.area, titleKey);
  const row: PracticedTopicEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    area: input.area,
    title: input.title,
    titleKey,
    origin: input.origin,
    completedAt: new Date().toISOString(),
  };
  await setDoc(userDocRef<PracticedTopicEntry>(COGI_COLLECTIONS.practicedTopics, row.id), row);
}

/** Display titles of topics already practiced in this area (for prompt exclusion lists). */
export async function listPracticedTitles(area: PracticedTopicArea): Promise<string[]> {
  const rows = (await listCollectionRows<PracticedTopicEntry>(COGI_COLLECTIONS.practicedTopics))
    .filter((row) => row.area === area);
  return rows.map((r) => r.title);
}

/** Normalized title keys already practiced in this area (for de-duping AI output). */
export async function listPracticedTitleKeys(area: PracticedTopicArea): Promise<Set<string>> {
  const titles = await listPracticedTitles(area);
  return new Set(titles.map(normalizeTitleKey));
}
