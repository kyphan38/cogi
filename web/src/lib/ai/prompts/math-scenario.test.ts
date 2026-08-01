import { describe, expect, it } from "vitest";
import { buildStudentPrompt, buildTutorPrompt } from "./math-scenario";

describe("Math Scenario AI Prompts", () => {
  it("builds Tutor prompt without canonicalAnswer or explanation", () => {
    const prompt = buildTutorPrompt({
      scenarioId: "ev-test",
      situation: "Test situation",
      userCurrentThinking: "I think option A",
      keyTraps: ["Trap 1"],
      hintLadder: ["Nudge 1"],
      conversationHistory: [],
    });

    expect(prompt).toContain("SYSTEM PROMPT — AI TUTOR");
    expect(prompt).toContain("Test situation");
    expect(prompt).toContain("Trap 1");
    expect(prompt).not.toContain("canonicalAnswer");
    expect(prompt).not.toContain("explanation");
  });

  it("builds Student prompt in Alex persona", () => {
    const prompt = buildStudentPrompt({
      scenarioId: "ev-test",
      situation: "Test situation",
      toolName: "Expected Value Rule",
      fieldNote: "Test takeaway",
      userExplanation: "EV is probability times payoff",
      conversationHistory: [],
    });

    expect(prompt).toContain("SYSTEM PROMPT — AI STUDENT");
    expect(prompt).toContain("Alex");
    expect(prompt).toContain("Expected Value Rule");
    expect(prompt).toContain("EV is probability times payoff");
  });
});
