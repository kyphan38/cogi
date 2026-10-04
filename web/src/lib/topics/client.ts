import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { listCompletedExercises } from "@/lib/db/exercises";
import { COGI_COLLECTIONS, listCollectionRows } from "@/lib/db/firestore";
import type { PracticedTopicEntry } from "@/lib/types/practiced-topic";
import type { TopicIdea, TopicIdeaRequest } from "@/lib/topics/topic-ideas";

/** How many practised topics are sent to the AI to avoid (newest first). */
const PRACTISED_LIMIT = 100;

/**
 * Topics the user already practised: finished exercises' topics plus the practised-topic
 * list. Only these are excluded from new lists (PLAN-topic-ideas.md, decision 5).
 */
export async function practisedTopicTitles(): Promise<string[]> {
  const [done, practised] = await Promise.all([
    listCompletedExercises().catch(() => []),
    listCollectionRows<PracticedTopicEntry>(COGI_COLLECTIONS.practicedTopics).catch(() => []),
  ]);
  const rows = [
    ...done.filter((e) => e.type !== "geo").map((e) => ({ title: e.domain, at: e.completedAt ?? "" })),
    ...practised.map((p) => ({ title: p.title, at: p.completedAt })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const t = r.title?.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= PRACTISED_LIMIT) break;
  }
  return out;
}

/** Ask for 10 topic ideas. `onScreen` are the titles currently shown, avoided too. */
export async function requestTopicIdeas(
  filters: Omit<TopicIdeaRequest, "exclude">,
  onScreen: string[] = [],
): Promise<TopicIdea[]> {
  const practised = await practisedTopicTitles();
  const res = await aiFetch("/api/ai/topic-ideas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...filters, exclude: [...practised, ...onScreen] }),
  });
  const json = await safeAiJson<{ ok: boolean; ideas?: TopicIdea[]; error?: string }>(res);
  if (!json.ok || !json.ideas) throw new Error(json.error || "Could not get topic ideas.");
  return json.ideas;
}
