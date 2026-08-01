import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseLiveScenarioDraft } from "./route";

function validDraftJson(): string {
  return JSON.stringify({
    situation: "A team is deciding whether to pay $10,000 for a service given a 20% chance of a $60,000 loss.",
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
    explanation: "Expected loss = 0.20 * $60,000 = $12,000. Cost = $10,000. Savings = $12,000 - $10,000 = $2,000.",
    toolName: "Live Draft Reasoning Move",
    transfers: [{ domain: "Test domain", mapping: "Test mapping." }],
    boundaries: [{ condition: "Test condition", whyItBreaks: "Test reason." }],
    fieldNote: "Test field note.",
  });
}

describe("parseLiveScenarioDraft", () => {
  it("parses a valid draft and injects server-known fields", () => {
    const result = parseLiveScenarioDraft(validDraftJson(), "expected_value", "My Chosen Title");
    expect(result.issues).toBeNull();
    expect(result.scenario?.topic).toBe("expected_value");
    expect(result.scenario?.title).toBe("My Chosen Title");
    expect(result.scenario?.id).toMatch(/^draft-/);
  });

  it("overrides model-provided topic/title/id with server-known values", () => {
    const raw = JSON.stringify({
      ...JSON.parse(validDraftJson()),
      id: "model-tried-to-set-this",
      topic: "graph_theory",
      title: "Model's own title",
    });
    const result = parseLiveScenarioDraft(raw, "expected_value", "My Chosen Title");
    expect(result.scenario?.id).not.toBe("model-tried-to-set-this");
    expect(result.scenario?.topic).toBe("expected_value");
    expect(result.scenario?.title).toBe("My Chosen Title");
  });

  it("returns issues for invalid JSON", () => {
    const result = parseLiveScenarioDraft("not json", "expected_value", "Title");
    expect(result.scenario).toBeNull();
    expect(result.issues).toContain("not valid JSON");
  });

  it("returns issues when required fields are missing", () => {
    const result = parseLiveScenarioDraft(JSON.stringify({ situation: "too short" }), "expected_value", "Title");
    expect(result.scenario).toBeNull();
    expect(result.issues).not.toBeNull();
  });
});
