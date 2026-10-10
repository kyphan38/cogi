import { describe, expect, it } from "vitest";
import { validateJudgmentSemantics, type JudgmentExercisePayload } from "./judgment";

function payload(): JudgmentExercisePayload {
  return {
    title: "Criticized in a meeting",
    scenario: "Your manager points out a mistake in your report in front of the team.",
    concepts: [
      { term: "Saving face", plain: "Keeping respect in front of others.", example: "Giving feedback in private." },
      { term: "Naming emotions", plain: "Saying what you feel.", example: "\"I felt embarrassed.\"" },
      { term: "What is in my control", plain: "The part you can change.", example: "Fixing the numbers." },
    ],
    conceptChecks: [{ question: "Which keeps face?", options: ["Private talk", "Public reply", "Silence forever"], answerIndex: 0, explanation: "It protects respect." }],
    lensQuestions: [
      { lens: "think", question: "What is the real problem?", options: ["One number was wrong", "My career is over", "The manager hates me"], answerIndex: 0, explanation: "Stick to facts." },
      { lens: "people", question: "What might the manager feel?", options: ["Pressure from a deadline", "Joy", "Nothing"], answerIndex: 0, explanation: "Stress explains the tone." },
      { lens: "steady", question: "How big is this?", options: ["A small fix", "A disaster", "Permanent"], answerIndex: 0, explanation: "It can be fixed today." },
    ],
    responses: [
      { id: "r1", text: "Talk to the manager in private after the meeting and fix the number.", expertRank: 1, why: "Calm and respectful.", lens: "people" },
      { id: "r2", text: "Say nothing and hope everyone forgets it.", expertRank: 2, why: "Avoids the problem.", lens: "steady" },
      { id: "r3", text: "Reply sharply in front of the whole team.", expertRank: 3, why: "Loses face for both.", lens: "people" },
    ],
  };
}

describe("validateJudgmentSemantics", () => {
  it("accepts a well-formed guided exercise", () => {
    expect(validateJudgmentSemantics(payload(), { responseCount: 3 })).toEqual([]);
  });

  it("requires a lens on every response", () => {
    const p = payload();
    delete p.responses[1]!.lens;
    expect(validateJudgmentSemantics(p, { responseCount: 3 }).join("\n")).toMatch(/r2: lens is required/);
  });

  it("rejects a lens answer that repeats a response", () => {
    const p = payload();
    p.lensQuestions[1]!.options[0] = "Talk to the manager in private after the meeting";
    expect(validateJudgmentSemantics(p, { responseCount: 3 }).join("\n")).toMatch(/lensQuestions\[people\]: the right reading repeats response r1/);
  });
});
