import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/types/exercise";
import { collectTerms } from "./terms";

const row = (id: string, createdAt: string, concepts: { term: string; plain: string; example: string }[]) =>
  ({ id, type: "judgment", title: `T${id}`, createdAt, concepts }) as unknown as Exercise;

describe("collectTerms", () => {
  it("merges terms by name, keeps the newest definition, sorts by name", () => {
    const terms = collectTerms([
      row("1", "2026-10-01", [{ term: "Saving face", plain: "old", example: "e" }]),
      row("2", "2026-10-02", [
        { term: "saving face", plain: "new", example: "e" },
        { term: "Circle of control", plain: "p", example: "e" },
      ]),
      { id: "3", type: "analytical", title: "A", createdAt: "2026-10-03" } as unknown as Exercise,
    ]);
    expect(terms.map((t) => t.term)).toEqual(["Circle of control", "saving face"]);
    expect(terms[1]!.plain).toBe("new");
    expect(terms[1]!.seenIn.map((s) => s.id)).toEqual(["2", "1"]);
  });
});
