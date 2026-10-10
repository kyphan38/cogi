import type { TopicIdea } from "@/lib/topics/topic-ideas";

/** A topic the user kept from a generated list, to start later without generating again. */
export interface SavedTopic extends TopicIdea {
  savedAt: string;
}

/** Keep the list short enough to scan. */
export const MAX_SAVED_TOPICS = 50;

/** Same title and mode = same topic. */
export function savedTopicKey(t: Pick<TopicIdea, "mode" | "title">): string {
  return `${t.mode}:${t.title.trim().toLowerCase()}`;
}

/** Add the topic (newest first), or remove it if it is already saved. */
export function toggleSavedTopic(list: SavedTopic[], idea: TopicIdea, now = new Date()): SavedTopic[] {
  const key = savedTopicKey(idea);
  if (list.some((t) => savedTopicKey(t) === key)) return list.filter((t) => savedTopicKey(t) !== key);
  const { title, mode, groupId, domain } = idea;
  return [{ title, mode, groupId, domain, savedAt: now.toISOString() }, ...list].slice(0, MAX_SAVED_TOPICS);
}
