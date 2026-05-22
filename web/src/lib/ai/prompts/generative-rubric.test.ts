import { describe, expect, it } from "vitest";
import { buildGenerativeRubricPrompt } from "./generative-rubric";
import type { GenerativeExerciseRow } from "@/lib/types/exercise";

function makeExercise(overrides?: Partial<GenerativeExerciseRow>): GenerativeExerciseRow {
  return {
    id: "ex1",
    type: "generative",
    domain: "economics",
    title: "Trade Policy Analysis",
    scenario: "Evaluate tariff impact",
    stageAtStart: "edit",
    prompts: [
      { id: "p1", question: "What is the main risk?" },
      { id: "p2", question: "What alternative exists?" },
      { id: "p3", question: "What is the downside?" },
      { id: "p4", question: "What do you recommend?" },
    ],
    answers: { p1: "Supply chain disruption.", p2: "Bilateral talks.", p3: "Job losses.", p4: "Gradual tariff reduction." },
    draftBaseline: {},
    debateOpening: null,
    debateTurns: [],
    rubricScore: null,
    confidenceBefore: 70,
    aiPerspective: null,
    createdAt: "2025-01-01",
    completedAt: "2025-01-02",
    ...overrides,
  };
}

describe("buildGenerativeRubricPrompt", () => {
  it("includes domain and title", () => {
    const result = buildGenerativeRubricPrompt(makeExercise());
    expect(result).toContain("economics");
    expect(result).toContain("Trade Policy Analysis");
  });

  it("includes QA pairs", () => {
    const result = buildGenerativeRubricPrompt(makeExercise());
    expect(result).toContain("p1: What is the main risk?");
    expect(result).toContain("Supply chain disruption.");
  });

  it("includes JSON schema markers", () => {
    const result = buildGenerativeRubricPrompt(makeExercise());
    expect(result).toContain('"overall"');
    expect(result).toContain('"clarity"');
    expect(result).toContain('"counterargument"');
    expect(result).toContain('"falsifiability"');
  });

  it("includes debate context when present", () => {
    const ex = makeExercise({
      debateOpening: "I challenge your view.",
      debateTurns: [{ userText: "Fair point.", assistantText: "But consider..." }],
    });
    const result = buildGenerativeRubricPrompt(ex);
    expect(result).toContain("I challenge your view.");
    expect(result).toContain("Fair point.");
  });

  it("includes geopolitics rubric emphasis when flagged", () => {
    const result = buildGenerativeRubricPrompt(makeExercise({ isGeopolitics: true }));
    expect(result).toContain("scenario-planning rubric");
    expect(result).toContain("upside and downside futures");
  });

  it("omits geopolitics rubric by default", () => {
    const result = buildGenerativeRubricPrompt(makeExercise());
    expect(result).not.toContain("scenario-planning rubric");
  });
});
