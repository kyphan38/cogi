import { describe, expect, it } from "vitest";
import { MAX_SAVED_TOPICS, savedTopicKey, toggleSavedTopic, type SavedTopic } from "./saved-topics";
import type { TopicIdea } from "./topic-ideas";

const idea = (title: string, mode: TopicIdea["mode"] = "judgment"): TopicIdea => ({ title, mode, groupId: "work", domain: "Work" });

describe("saved topics", () => {
  it("adds newest first, and removes on a second toggle", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    let list: SavedTopic[] = toggleSavedTopic([], idea("A"), now);
    list = toggleSavedTopic(list, idea("B"), now);
    expect(list.map((t) => t.title)).toEqual(["B", "A"]);
    expect(list[0]!.savedAt).toBe(now.toISOString());
    list = toggleSavedTopic(list, idea("a "), now);
    expect(list.map((t) => t.title)).toEqual(["B"]);
  });

  it("treats the same title in another mode as another topic", () => {
    expect(savedTopicKey(idea("A", "judgment"))).not.toBe(savedTopicKey(idea("A", "reframe")));
  });

  it("keeps at most the limit", () => {
    let list: SavedTopic[] = [];
    for (let i = 0; i < MAX_SAVED_TOPICS + 5; i++) list = toggleSavedTopic(list, idea(`T${i}`));
    expect(list).toHaveLength(MAX_SAVED_TOPICS);
    expect(list[0]!.title).toBe(`T${MAX_SAVED_TOPICS + 4}`);
  });
});
