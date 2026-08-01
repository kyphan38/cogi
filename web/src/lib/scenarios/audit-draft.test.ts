import { describe, expect, it } from "vitest";
import { auditScenarioDraft } from "./audit-draft";
import { expectedValueScenarios } from "./expected-value";
import type { Scenario } from "@/lib/types/math-scenario";

function validBaselineScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "ev-test-baseline",
    topic: "expected_value",
    title: "Test Baseline Scenario",
    situation:
      "A team is deciding whether to pay $10,000 for a service given a 20% chance of a $60,000 loss without it.",
    commitSpec: {
      kind: "multiple_choice",
      promptText: "Select the rational choice.",
      correctOptionId: "opt_a",
      options: [
        { id: "opt_a", text: "Buy the service" },
        { id: "opt_b", text: "Skip the service" },
      ],
    },
    keyTraps: ["Ignoring probability weighting."],
    hintLadder: ["What is the average cost of skipping?"],
    canonicalAnswer: "Buy the service. Net expected savings: +$2,000.",
    explanation: "Expected loss without service = 0.20 * $60,000 = $12,000. Cost of service = $10,000. Net expected savings = $12,000 - $10,000 = $2,000.",
    toolName: "Test-Only Reasoning Move",
    transfers: [{ domain: "Test domain", mapping: "Test mapping." }],
    boundaries: [{ condition: "Test condition", whyItBreaks: "Test reason." }],
    fieldNote: "Test field note.",
    ...overrides,
  };
}

describe("auditScenarioDraft - regression against the 4 live scenarios", () => {
  it.each(expectedValueScenarios)("$id passes the automated audit against its siblings", (scenario) => {
    const siblings = expectedValueScenarios.filter((s) => s.id !== scenario.id);
    const result = auditScenarioDraft(scenario, siblings);
    expect(result.failures).toEqual([]);
    expect(result.pass).toBe(true);
  });
});

describe("auditScenarioDraft - synthetic failures", () => {
  it("passes a well-formed, distinct draft", () => {
    const result = auditScenarioDraft(validBaselineScenario(), expectedValueScenarios);
    expect(result.pass).toBe(true);
  });

  it("flags a clone (toolName duplicates an existing scenario)", () => {
    const draft = validBaselineScenario({ toolName: expectedValueScenarios[0].toolName });
    const result = auditScenarioDraft(draft, expectedValueScenarios);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("not distinct"))).toBe(true);
  });

  it("flags a leaky option label", () => {
    const draft = validBaselineScenario({
      commitSpec: {
        kind: "multiple_choice",
        promptText: "Select the rational choice.",
        correctOptionId: "opt_a",
        options: [
          { id: "opt_a", text: "Buy the service - this is the optimal choice" },
          { id: "opt_b", text: "Skip the service" },
        ],
      },
    });
    const result = auditScenarioDraft(draft, []);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("leaks the answer"))).toBe(true);
  });

  it("does not flag a dollar figure in a label describing the action's own cost", () => {
    const draft = validBaselineScenario({
      commitSpec: {
        kind: "multiple_choice",
        promptText: "Select the rational choice.",
        correctOptionId: "opt_a",
        options: [
          { id: "opt_a", text: "Pay $10,000 for the service" },
          { id: "opt_b", text: "Skip the service" },
        ],
      },
    });
    const result = auditScenarioDraft(draft, []);
    expect(result.failures.some((f) => f.includes("leaks the answer"))).toBe(false);
  });

  it("flags an answer that is asserted rather than derived (no calculation shown)", () => {
    const draft = validBaselineScenario({
      explanation: "Buying the service is clearly the better choice for this business.",
    });
    const result = auditScenarioDraft(draft, []);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("no '='"))).toBe(true);
  });

  it("flags a missing correctOptionId", () => {
    const draft = validBaselineScenario({
      commitSpec: {
        kind: "multiple_choice",
        promptText: "Select the rational choice.",
        options: [
          { id: "opt_a", text: "Buy the service" },
          { id: "opt_b", text: "Skip the service" },
        ],
      },
    });
    const result = auditScenarioDraft(draft, []);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("correctOptionId is missing"))).toBe(true);
  });

  it("flags a correctOptionId whose text is inconsistent with canonicalAnswer", () => {
    const draft = validBaselineScenario({
      commitSpec: {
        kind: "multiple_choice",
        promptText: "Select the rational choice.",
        correctOptionId: "opt_b",
        options: [
          { id: "opt_a", text: "Purchase the redundancy plan" },
          { id: "opt_b", text: "Decline and remain exposed" },
        ],
      },
      canonicalAnswer: "Purchase the redundancy plan. Net expected savings: +$2,000.",
    });
    const result = auditScenarioDraft(draft, []);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("shares no words"))).toBe(true);
  });

  it("flags empty keyTraps/hintLadder/transfers/boundaries", () => {
    const draft = validBaselineScenario({ keyTraps: [], hintLadder: [], transfers: [], boundaries: [] });
    const result = auditScenarioDraft(draft, []);
    expect(result.pass).toBe(false);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        "keyTraps must not be empty.",
        "hintLadder must not be empty.",
        "transfers must not be empty.",
        "boundaries must not be empty.",
      ]),
    );
  });

  it("flags a situation with no numeric figures", () => {
    const draft = validBaselineScenario({
      situation: "A team is deciding whether to buy a service that might help avoid future losses somehow.",
    });
    const result = auditScenarioDraft(draft, []);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("no numeric figures"))).toBe(true);
  });
});
