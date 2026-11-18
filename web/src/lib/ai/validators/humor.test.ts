import { describe, expect, it } from "vitest";
import { parseHumorExerciseJson, validateHumorGrade, validateHumorSemantics, type HumorExercisePayload, type HumorRound } from "./humor";

const check = { question: "Q?", options: ["a", "b", "c"], answerIndex: 1, explanation: "e" };
const concept = { term: "t", plain: "p", example: "e" };
const round = (serious = false): HumorRound => ({
  moment: "You spill coffee in the meeting.",
  serious,
  trap: "Over-explaining",
  trapWhy: "w",
  options: [
    { text: "one", quality: "ok", why: "w" },
    { text: "two", quality: "best", why: "w" },
    { text: "three", quality: "poor", why: "w" },
  ],
});

const payload = (over: Partial<HumorExercisePayload> = {}): HumorExercisePayload => ({
  safety: "ok",
  title: "T",
  setting: "S",
  concepts: [concept, { ...concept, term: "u" }, { ...concept, term: "v" }],
  conceptChecks: [check],
  rounds: [round(), round(), round()],
  ...over,
});

describe("humor validator", () => {
  it("parses JSON in fences", () => {
    const r = parseHumorExerciseJson("```json\n" + JSON.stringify(payload()) + "\n```");
    expect(r.success).toBe(true);
  });

  it("accepts a valid exercise", () => {
    expect(validateHumorSemantics(payload(), { rounds: 3 })).toEqual([]);
  });

  it("needs the right number of rounds", () => {
    expect(validateHumorSemantics(payload(), { rounds: 4 }).join()).toMatch(/exactly 4/);
  });

  it("needs one best, one ok and one poor reply", () => {
    const bad: HumorRound = { ...round(), options: round().options.map((o) => ({ ...o, quality: "best" })) };
    expect(validateHumorSemantics(payload({ rounds: [round(), round(), bad] }), { rounds: 3 }).join()).toMatch(/one "best"/);
  });

  it("needs exactly one serious moment when the level asks for it", () => {
    expect(validateHumorSemantics(payload(), { rounds: 3, seriousRound: true }).join()).toMatch(/serious/);
    expect(validateHumorSemantics(payload({ rounds: [round(), round(true), round()] }), { rounds: 3, seriousRound: true })).toEqual([]);
    expect(validateHumorSemantics(payload({ rounds: [round(), round(true), round()] }), { rounds: 3 }).join()).toMatch(/serious/);
  });

  it("allows concern only for the user's own situation", () => {
    const concern = payload({ safety: "concern", title: "", setting: "" });
    expect(validateHumorSemantics(concern, { rounds: 3, ownSituation: true })).toEqual([]);
    expect(validateHumorSemantics(concern, { rounds: 3 })).not.toEqual([]);
  });

  it("needs one grade per round", () => {
    const steps = { kind: true, fits: true, short: true, twist: true };
    expect(validateHumorGrade({ rounds: [{ steps, strong: "", missing: "", better: "b" }], overall: "o" }, 2)).not.toEqual([]);
  });
});
