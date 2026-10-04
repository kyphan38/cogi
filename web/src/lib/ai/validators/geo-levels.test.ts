import { describe, expect, it } from "vitest";
import { validateGeopoliticsAnalyticalSemantics, type AnalyticalExercise } from "./common";
import { GEO_ANALYTICAL_LEVELS } from "@/lib/exercise/analytical-levels";

const passage =
  "Beijing's new port deal is the sensible path for the region. Local fishers were not asked. " +
  "Trade rose after the deal was signed. Freight costs in the bay fell by about a third in two years.";

function guidedPayload(): AnalyticalExercise {
  return {
    title: "A port deal",
    passage,
    embeddedIssues: [
      { description: "d", type: "framing_bias", severity: "obvious", textSegment: "Beijing's new port deal is the sensible path for the region.", explanation: "e" },
      { description: "d", type: "missing_actor", severity: "moderate", textSegment: "Local fishers were not asked.", explanation: "e" },
    ],
    validPoints: [{ textSegment: "Trade rose after the deal was signed.", explanation: "e" }],
    hiddenPerspective: "Chinese state-media framing",
    missingActors: ["Local fishers"],
    concepts: [
      { term: "Framing", plain: "Making one side's view look normal.", example: "Calling a tax 'relief'." },
      { term: "Stakeholder", plain: "Someone affected by a decision.", example: "Fishers near a new port." },
    ],
    conceptChecks: [{ question: "Q?", options: ["a", "b", "c"], answerIndex: 0, explanation: "e" }],
    perspectiveOptions: ["US-aligned think tank", "Chinese state-media framing", "ASEAN neutral broker framing", "Russian security narrative"],
    actorCandidates: ["Local fishers", "Port company", "Beijing", "Shipping firms"],
    lensQuestions: (["realist", "liberal", "constructivist", "political_economy"] as const).map((lens) => ({
      lens,
      question: `What does the ${lens} lens see?`,
      options: ["x", "y", "z"],
      answerIndex: 1,
      explanation: "e",
    })),
  };
}

describe("validateGeopoliticsAnalyticalSemantics with a level", () => {
  it("accepts a Guided brief: 2 issues, 1 trap, and the learning extras", () => {
    expect(validateGeopoliticsAnalyticalSemantics(guidedPayload(), { level: GEO_ANALYTICAL_LEVELS.guided })).toEqual([]);
  });

  it("rejects missing or broken extras", () => {
    const p = guidedPayload();
    p.perspectiveOptions = ["A", "B", "C", "D"];
    p.actorCandidates = ["Port company", "Beijing", "Shipping firms", "Banks"];
    p.lensQuestions = p.lensQuestions!.slice(0, 3);
    p.concepts = [];
    const errors = validateGeopoliticsAnalyticalSemantics(p, { level: GEO_ANALYTICAL_LEVELS.guided }).join("\n");
    expect(errors).toMatch(/perspectiveOptions must include hiddenPerspective/);
    expect(errors).toMatch(/actorCandidates must include the missing actor "Local fishers"/);
    expect(errors).toMatch(/lensQuestions must have exactly one question for each lens/);
    expect(errors).toMatch(/concepts must have 2-4 items/);
  });

  it("asks for all four issue types at Standard, and planted types must match the level", () => {
    const errors = validateGeopoliticsAnalyticalSemantics(guidedPayload(), { level: GEO_ANALYTICAL_LEVELS.standard }).join("\n");
    expect(errors).toMatch(/embeddedIssues must have exactly 4 items/);
    expect(errors).toMatch(/expected 1 embedded issue\(s\) of type assumed_causation, got 0/);
    expect(errors).toMatch(/validPoints must have exactly 2 item/);
  });

  it("keeps pasted text (no level) to the old rules without extras", () => {
    const p = guidedPayload();
    delete p.concepts;
    const errors = validateGeopoliticsAnalyticalSemantics(p).join("\n");
    expect(errors).toMatch(/embeddedIssues must have exactly 4 items/);
    expect(errors).not.toMatch(/concepts/);
  });
});
