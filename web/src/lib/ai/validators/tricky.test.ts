import { describe, expect, it } from "vitest";
import { parseTrickyExerciseJson, validateTrickyGrade, validateTrickySemantics, type TrickyExercisePayload } from "./tricky";

const check = { question: "Q?", options: ["a", "b", "c"], answerIndex: 1, explanation: "e" };
const concept = { term: "t", plain: "p", example: "e" };
const round = {
  question: "A or B?",
  trap: "Forced choice",
  trapWhy: "w",
  options: [
    { text: "one", quality: "ok", why: "w" },
    { text: "two", quality: "best", why: "w" },
    { text: "three", quality: "poor", why: "w" },
  ],
};

const payload = (over: Partial<TrickyExercisePayload> = {}): TrickyExercisePayload =>
  ({
    safety: "ok",
    title: "T",
    setting: "S",
    asker: "Your boss",
    concepts: [concept, { ...concept, term: "u" }, { ...concept, term: "v" }],
    conceptChecks: [check],
    rounds: [round, round],
    ...over,
  }) as TrickyExercisePayload;

describe("tricky validator", () => {
  it("parses JSON in fences", () => {
    const r = parseTrickyExerciseJson("```json\n" + JSON.stringify(payload()) + "\n```");
    expect(r.success).toBe(true);
  });

  it("accepts a valid exercise", () => {
    expect(validateTrickySemantics(payload(), { rounds: 2 })).toEqual([]);
  });

  it("needs the right number of rounds", () => {
    expect(validateTrickySemantics(payload(), { rounds: 3 }).join()).toMatch(/exactly 3/);
  });

  it("needs one best, one ok and one poor answer", () => {
    const bad = { ...round, options: round.options.map((o) => ({ ...o, quality: "best" as const })) };
    expect(validateTrickySemantics(payload({ rounds: [round, bad] }), { rounds: 2 }).join()).toMatch(/one "best"/);
  });

  it("allows concern only for the user's own situation", () => {
    const concern = payload({ safety: "concern", title: "", setting: "" });
    expect(validateTrickySemantics(concern, { rounds: 2, ownSituation: true })).toEqual([]);
    expect(validateTrickySemantics(concern, { rounds: 2 })).not.toEqual([]);
  });

  it("needs one grade per round", () => {
    const steps = { criteria: true, view: true, fair: true, handBack: true };
    expect(validateTrickyGrade({ rounds: [{ steps, strong: "", missing: "", better: "b" }], overall: "o" }, 2)).not.toEqual([]);
  });
});
