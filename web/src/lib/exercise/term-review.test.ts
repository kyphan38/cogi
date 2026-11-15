import { describe, expect, it } from "vitest";
import type { LearnedTerm } from "@/lib/exercise/terms";
import { blankTerm, dueTerms, pickTermReview, termChoices, termState, termStatus, TERM_REVIEW_LENGTH } from "@/lib/exercise/term-review";
import { addDays, initialState, nextState, reviewStatus, TERM_REVIEW_INTERVALS } from "@/lib/review/schedule";

const term = (key: string, firstSeen = "2026-11-01T10:00:00"): LearnedTerm => ({
  key,
  term: key,
  plain: `meaning of ${key}`,
  example: `An example with ${key}.`,
  seenIn: [],
  firstSeen,
});

describe("review schedule (1-3-7-21)", () => {
  it("a new item is due one day after it was met", () => {
    expect(initialState("2026-11-01")).toEqual({ step: 0, due: "2026-11-02" });
  });

  it("right answers walk 3, 7, 21 days, then the item is known", () => {
    let s = initialState("2026-11-01");
    s = nextState(s, true, "2026-11-02");
    expect(s).toEqual({ step: 1, due: "2026-11-05" });
    s = nextState(s, true, "2026-11-05");
    expect(s).toEqual({ step: 2, due: "2026-11-12" });
    s = nextState(s, true, "2026-11-12");
    expect(s).toEqual({ step: 3, due: "2026-12-03" });
    s = nextState(s, true, "2026-12-03");
    expect(s).toEqual({ step: TERM_REVIEW_INTERVALS.length, due: null });
    expect(reviewStatus(s, "2027-01-01")).toBe("known");
  });

  it("a miss at any step starts again at 1 day", () => {
    const s = nextState({ step: 3, due: "2026-12-03" }, false, "2026-12-03");
    expect(s).toEqual({ step: 0, due: "2026-12-04" });
  });

  it("addDays crosses months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("term review", () => {
  const today = "2026-11-15";

  it("every old term is due; a term met today is not", () => {
    const old = term("old", "2026-01-01T09:00:00");
    const fresh = term("fresh", "2026-11-15T09:00:00");
    expect(termStatus(old, {}, today)).toBe("due");
    expect(termStatus(fresh, {}, today)).toBe("learning");
    expect(dueTerms([old, fresh], {}, today).map((t) => t.key)).toEqual(["old"]);
  });

  it("saved state wins over the first-seen day", () => {
    const t = term("a", "2026-01-01T09:00:00");
    expect(termState(t, { a: { step: 2, due: "2026-11-20" } })).toEqual({ step: 2, due: "2026-11-20" });
    expect(termStatus(t, { a: { step: 4, due: null } }, today)).toBe("known");
  });

  it("picks at most 5, longest overdue first", () => {
    const terms = Array.from({ length: 8 }, (_, i) => term(`t${i}`, `2026-10-0${i + 1}T09:00:00`));
    const picked = pickTermReview(terms.reverse(), {}, today);
    expect(picked).toHaveLength(TERM_REVIEW_LENGTH);
    expect(picked.map((t) => t.key)).toEqual(["t0", "t1", "t2", "t3", "t4"]);
  });

  it("choices: the target and 3 others, stable for a seed, none with fewer than 4 terms", () => {
    const all = ["a", "b", "c", "d", "e", "f"].map((k) => term(k));
    const c1 = termChoices(all[0]!, all, "s1")!;
    expect(c1).toHaveLength(4);
    expect(c1.map((t) => t.key)).toContain("a");
    expect(new Set(c1.map((t) => t.key)).size).toBe(4);
    expect(termChoices(all[0]!, all, "s1")!.map((t) => t.key)).toEqual(c1.map((t) => t.key));
    expect(termChoices(all[0]!, all.slice(0, 3), "s1")).toBeNull();
  });

  it("the target is not always first", () => {
    const all = ["a", "b", "c", "d", "e", "f"].map((k) => term(k));
    const positions = new Set(
      Array.from({ length: 20 }, (_, i) => termChoices(all[0]!, all, `seed-${i}`)!.findIndex((t) => t.key === "a")),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it("blankTerm hides the term in any case and leaves other text", () => {
    expect(blankTerm("Saving face matters. She was saving FACE.", "saving face")).toBe("____ matters. She was ____.");
    expect(blankTerm("No match here.", "base rate")).toBe("No match here.");
    expect(blankTerm("Cost (a+b) rises.", "(a+b)")).toBe("Cost ____ rises.");
  });
});
