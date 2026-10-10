import { describe, expect, it } from "vitest";
import { REFRAME_TAGS } from "@/lib/ai/validators/reframe";
import { REFRAME_TRAP_GUIDE } from "./reframe-trap-guide";
import { mostlyRepeats, pickTrapCards, sanitizeTrapCards } from "./reframe-trap-cards";
import type { ReframeResult } from "./reframe-score";

const thoughts = [
  { id: "t1", trap: "all_or_nothing" as const },
  { id: "t2", trap: "mind_reading" as const },
  { id: "t3", trap: "realistic" as const },
  { id: "t4", trap: "should_statements" as const },
];

const outcome = (id: string, o: Partial<ReframeResult["thoughts"][number]>) => ({
  id,
  trap: thoughts.find((t) => t.id === id)!.trap,
  userAnswer: null,
  found: false,
  tagMatched: false,
  trapped: false,
  ...o,
});

describe("trap guide", () => {
  it("covers every trap, with every field filled", () => {
    for (const tag of REFRAME_TAGS) {
      const g = REFRAME_TRAP_GUIDE[tag];
      expect(g, tag).toBeTruthy();
      for (const v of [g.spot, g.ask, g.fix, g.othersTip, g.practice]) expect(v.trim().length, tag).toBeGreaterThan(10);
      expect(g.signals.length, tag).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pickTrapCards", () => {
  it("all right: the rewritten thought's trap, then the next one", () => {
    const result = {
      thoughts: [
        outcome("t1", { userAnswer: "all_or_nothing", found: true, tagMatched: true }),
        outcome("t2", { userAnswer: "mind_reading", found: true, tagMatched: true }),
        outcome("t3", { userAnswer: "realistic" }),
        outcome("t4", { userAnswer: "should_statements", found: true, tagMatched: true }),
      ],
    };
    expect(pickTrapCards(thoughts, { thoughtId: "t1" }, result)).toEqual(["all_or_nothing", "mind_reading"]);
  });

  it("puts missed and wrongly named traps first, then a trap put on a fair thought", () => {
    const result = {
      thoughts: [
        outcome("t1", { userAnswer: "all_or_nothing", found: true, tagMatched: true }),
        outcome("t2", { userAnswer: "realistic" }),
        outcome("t3", { userAnswer: "catastrophizing", trapped: true }),
        outcome("t4", { userAnswer: "all_or_nothing", found: true, tagMatched: false }),
      ],
    };
    expect(pickTrapCards(thoughts, { thoughtId: "t1" }, result)).toEqual(["mind_reading", "should_statements"]);
    const oneMiss = { thoughts: result.thoughts.map((o) => (o.id === "t4" ? { ...o, tagMatched: true } : o)) };
    expect(pickTrapCards(thoughts, { thoughtId: "t1" }, oneMiss)).toEqual(["mind_reading", "catastrophizing"]);
  });
});

describe("mostlyRepeats", () => {
  it("catches a fair thought that already is the balanced rewrite", () => {
    expect(
      mostlyRepeats(
        "I messed up one slide and felt bad, but the rest of the presentation was clear.",
        "I mixed up a term on slide three and felt embarrassed. But I fixed it and finished the rest of the presentation cleanly.",
      ),
    ).toBe(true);
    expect(mostlyRepeats("I messed up one slide and felt bad.", "My manager has not replied to my email yet.")).toBe(false);
  });
});

describe("sanitizeTrapCards", () => {
  const ctx = { domain: "School", balanced: "I messed up one slide, but the rest of the presentation was clear." };
  const card = (trap: string, area = "Family") => ({
    trap,
    othersSay: "My boss hates me, she did not reply.",
    youCouldSay: "That sounds stressful. What did she actually say?",
    elsewhere: { area, thought: "Mum went quiet at dinner. She is disappointed in me.", balanced: "Mum was quiet. I can ask her later." },
  });

  it("keeps one card per picked trap, in pick order, and drops unknown traps", () => {
    const out = sanitizeTrapCards([card("labeling"), card("mind_reading"), card("all_or_nothing")], ["all_or_nothing", "mind_reading"], ctx);
    expect(out.map((c) => c.trap)).toEqual(["all_or_nothing", "mind_reading"]);
  });

  it("drops an example from the same area, but keeps the card", () => {
    const [c] = sanitizeTrapCards([card("mind_reading", "school")], ["mind_reading"], ctx);
    expect(c!.othersSay).toBeTruthy();
    expect(c!.elsewhere.thought).toBe("");
  });

  it("ignores cards with empty fields and non-arrays", () => {
    expect(sanitizeTrapCards([{ ...card("mind_reading"), othersSay: " " }], ["mind_reading"], ctx)).toEqual([]);
    expect(sanitizeTrapCards(null, ["mind_reading"], ctx)).toEqual([]);
  });
});
