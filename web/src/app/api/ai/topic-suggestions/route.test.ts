import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseTopicSuggestions } from "./route";

describe("parseTopicSuggestions", () => {
  it("parses a valid array of 5 suggestions", () => {
    const raw = JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({ title: `Title ${i}`, blurb: `Blurb ${i}` })),
    );
    const result = parseTopicSuggestions(raw, []);
    expect(result).toHaveLength(5);
  });

  it("returns null for invalid JSON", () => {
    expect(parseTopicSuggestions("not json", [])).toBeNull();
  });

  it("returns null when the top level is not an array", () => {
    expect(parseTopicSuggestions(JSON.stringify({ title: "x", blurb: "y" }), [])).toBeNull();
  });

  it("drops items missing title or blurb", () => {
    const raw = JSON.stringify([
      { title: "Good", blurb: "Fine" },
      { title: "Missing blurb" },
      { blurb: "Missing title" },
    ]);
    const result = parseTopicSuggestions(raw, []);
    expect(result).toEqual([{ title: "Good", blurb: "Fine" }]);
  });

  it("excludes titles matching the exclude list, case/whitespace-insensitively", () => {
    const raw = JSON.stringify([
      { title: "  Devops   Migration  ", blurb: "b1" },
      { title: "New Topic", blurb: "b2" },
    ]);
    const result = parseTopicSuggestions(raw, ["DevOps Migration"]);
    expect(result).toEqual([{ title: "New Topic", blurb: "b2" }]);
  });

  it("de-duplicates in-batch title collisions", () => {
    const raw = JSON.stringify([
      { title: "Same Topic", blurb: "b1" },
      { title: "same topic", blurb: "b2" },
    ]);
    const result = parseTopicSuggestions(raw, []);
    expect(result).toHaveLength(1);
  });

  it("caps at 5 items even if more are returned", () => {
    const raw = JSON.stringify(
      Array.from({ length: 8 }, (_, i) => ({ title: `Title ${i}`, blurb: `Blurb ${i}` })),
    );
    const result = parseTopicSuggestions(raw, []);
    expect(result).toHaveLength(5);
  });

  it("returns null when every item is excluded (empty result)", () => {
    const raw = JSON.stringify([{ title: "Excluded", blurb: "b1" }]);
    const result = parseTopicSuggestions(raw, ["Excluded"]);
    expect(result).toBeNull();
  });
});
