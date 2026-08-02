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

    expect(prompt).toContain("SYSTEM PROMPT - AI TUTOR");
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

    expect(prompt).toContain("SYSTEM PROMPT - AI STUDENT");
    expect(prompt).toContain("Alex");
    expect(prompt).toContain("Expected Value Rule");
    expect(prompt).toContain("EV is probability times payoff");
  });

  it("formats a non-empty Tutor conversation history as SENDER: message lines", () => {
    const prompt = buildTutorPrompt({
      scenarioId: "ev-test",
      situation: "Test situation",
      userCurrentThinking: "I think option A",
      keyTraps: ["Trap 1"],
      hintLadder: ["Nudge 1"],
      conversationHistory: [
        { sender: "user", message: "What should I consider?" },
        { sender: "tutor", message: "What outcome matters most?" },
      ],
    });

    expect(prompt).toContain("USER: What should I consider?");
    expect(prompt).toContain("TUTOR: What outcome matters most?");
    expect(prompt).not.toContain("(Beginning of conversation)");
  });

  it("falls back to a placeholder when the Tutor conversation history is empty", () => {
    const prompt = buildTutorPrompt({
      scenarioId: "ev-test",
      situation: "Test situation",
      userCurrentThinking: "I think option A",
      keyTraps: ["Trap 1"],
      hintLadder: ["Nudge 1"],
      conversationHistory: [],
    });

    expect(prompt).toContain("(Beginning of conversation)");
  });

  it("formats a non-empty Student conversation history as SENDER: message lines", () => {
    const prompt = buildStudentPrompt({
      scenarioId: "ev-test",
      situation: "Test situation",
      toolName: "Expected Value Rule",
      fieldNote: "Test takeaway",
      userExplanation: "EV is probability times payoff",
      conversationHistory: [
        { sender: "student", message: "Wait, why multiply by a percentage?" },
        { sender: "user", message: "Because it's the probability of the bad outcome." },
      ],
    });

    expect(prompt).toContain("STUDENT: Wait, why multiply by a percentage?");
    expect(prompt).toContain("USER: Because it's the probability of the bad outcome.");
    expect(prompt).not.toContain("(Beginning of Feynman teach-back)");
  });

  it("falls back to a placeholder when the Student conversation history is empty", () => {
    const prompt = buildStudentPrompt({
      scenarioId: "ev-test",
      situation: "Test situation",
      toolName: "Expected Value Rule",
      fieldNote: "Test takeaway",
      userExplanation: "EV is probability times payoff",
      conversationHistory: [],
    });

    expect(prompt).toContain("(Beginning of Feynman teach-back)");
  });
});
