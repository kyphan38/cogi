import { describe, expect, it } from "vitest";
import type { ReframeRewrite, ReframeThought } from "@/lib/ai/validators/reframe";
import { rateReframe, reframeCoachingRefs, scoreReframe, type ReframeResult } from "./reframe-score";

const thoughts: ReframeThought[] = [
  { id: "t1", text: "I always ruin everything.", trap: "overgeneralizing", alsoAccepted: ["all_or_nothing"], why: "One event becomes always." },
  { id: "t2", text: "She thinks I am lazy.", trap: "mind_reading", alsoAccepted: [], why: "A guess." },
  { id: "t3", text: "I will be fired.", trap: "catastrophizing", alsoAccepted: ["fortune_telling"], why: "Worst case." },
  { id: "t4", text: "One number was wrong, and I need to fix it today.", trap: "realistic", alsoAccepted: [], why: "Fair and specific." },
];
const rewrite: ReframeRewrite = {
  thoughtId: "t3",
  question: "Which is the most balanced?",
  options: ["Balanced", "Everything is fine", "I am useless"],
  answerIndex: 0,
  explanation: "Fair to the facts.",
  balancedExample: "One mistake rarely gets someone fired.",
};

describe("scoreReframe", () => {
  it("counts found traps, accepted names, and fair thoughts marked as traps", () => {
    const r = scoreReframe({
      thoughts,
      answers: { t1: "all_or_nothing", t2: "labeling", t3: "realistic", t4: "personalizing" },
      rewrite,
      rewriteChoice: 1,
      rewriteWritten: false,
    });
    expect(r.total).toBe(3);
    expect(r.realisticTotal).toBe(1);
    expect(r.found).toBe(2);
    expect(r.tagsMatched).toBe(1); // t1 via alsoAccepted; t2 found under another name
    expect(r.trapsHit).toBe(1);
    expect(r.rewriteCorrect).toBe(false);
    expect(r.thoughts.find((t) => t.id === "t3")).toMatchObject({ found: false, tagMatched: false });
  });

  it("leaves rewriteCorrect empty when the user wrote their own", () => {
    const r = scoreReframe({ thoughts, answers: {}, rewrite, rewriteWritten: true });
    expect(r.rewriteCorrect).toBeNull();
    expect(r.found).toBe(0);
    expect(r.thoughts.every((t) => t.userAnswer === null)).toBe(true);
  });
});

const result = (p: Partial<ReframeResult>): ReframeResult => ({
  thoughts: [],
  found: 0,
  total: 4,
  tagsMatched: 0,
  trapsHit: 0,
  realisticTotal: 2,
  rewriteCorrect: null,
  ...p,
});

describe("rateReframe", () => {
  it("rates like Analytical, and 2+ fair thoughts marked as traps is poor", () => {
    expect(rateReframe(result({ found: 3, trapsHit: 1 }))).toBe("good");
    expect(rateReframe(result({ found: 2 }))).toBe("ok");
    expect(rateReframe(result({ found: 1 }))).toBe("poor");
    expect(rateReframe(result({ found: 4, trapsHit: 2 }))).toBe("poor");
  });

  it("rates an all-realistic exercise on fair thoughts alone", () => {
    expect(rateReframe(result({ total: 0 }))).toBe("good");
    expect(rateReframe(result({ total: 0, trapsHit: 1 }))).toBe("ok");
  });
});

describe("reframeCoachingRefs", () => {
  it("requires thoughts not handled fully right, and always the rewrite", () => {
    const r = scoreReframe({
      thoughts,
      answers: { t1: "overgeneralizing", t2: "labeling", t4: "realistic" },
      rewrite,
      rewriteWritten: true,
    });
    const refs = reframeCoachingRefs(r);
    expect(refs.required).toEqual(["thought_t2", "thought_t3", "rewrite"]);
    expect(refs.allowed).toEqual(["thought_t1", "thought_t2", "thought_t3", "thought_t4", "rewrite"]);
  });
});
