import { describe, expect, it } from "vitest";
import { buildGenerativeDebateStartPrompt, buildGenerativeDebateContinuePrompt } from "./generative-debate";

describe("buildGenerativeDebateStartPrompt", () => {
  const base = {
    domain: "economics",
    title: "Trade Policy Analysis",
    scenario: "Evaluate impact of tariffs",
    qa: [
      { id: "p1", question: "What is the main risk?", answer: "Supply chain disruption." },
      { id: "p2", question: "What alternative exists?", answer: "Bilateral agreements." },
    ],
  };

  it("includes domain and title", () => {
    const result = buildGenerativeDebateStartPrompt(base);
    expect(result).toContain("economics");
    expect(result).toContain("Trade Policy Analysis");
  });

  it("includes user QA pairs", () => {
    const result = buildGenerativeDebateStartPrompt(base);
    expect(result).toContain("What is the main risk?");
    expect(result).toContain("Supply chain disruption.");
    expect(result).toContain("Bilateral agreements.");
  });

  it("includes scenario framing", () => {
    const result = buildGenerativeDebateStartPrompt(base);
    expect(result).toContain("Evaluate impact of tariffs");
  });

  it("includes steelman when provided", () => {
    const result = buildGenerativeDebateStartPrompt({ ...base, steelmanText: "Tariffs could protect domestic jobs." });
    expect(result).toContain("Tariffs could protect domestic jobs.");
    expect(result).toContain("steelman");
  });

  it("omits steelman section when not provided", () => {
    const result = buildGenerativeDebateStartPrompt(base);
    expect(result).not.toContain("steelman");
  });

  it("includes geopolitics block when flagged", () => {
    const result = buildGenerativeDebateStartPrompt({ ...base, isGeopolitics: true });
    expect(result).toContain("actor motivations");
    expect(result).toContain("Socratic persona");
  });

  it("omits geopolitics block by default", () => {
    const result = buildGenerativeDebateStartPrompt(base);
    expect(result).not.toContain("actor motivations");
  });

  it("includes DEBATE_CLARITY_RULES content", () => {
    const result = buildGenerativeDebateStartPrompt(base);
    expect(result).toContain("PROHIBITION");
  });
});

describe("buildGenerativeDebateContinuePrompt", () => {
  const input = {
    domain: "economics",
    title: "Trade Policy",
    history: [
      { role: "assistant" as const, content: "I challenge your assumption about tariffs." },
      { role: "user" as const, content: "But the data shows improvement." },
    ],
    userReply: "Let me clarify my position on subsidies.",
  };

  it("includes domain and title", () => {
    const result = buildGenerativeDebateContinuePrompt(input);
    expect(result).toContain("economics");
    expect(result).toContain("Trade Policy");
  });

  it("includes chat history", () => {
    const result = buildGenerativeDebateContinuePrompt(input);
    expect(result).toContain("ASSISTANT: I challenge your assumption");
    expect(result).toContain("USER: But the data shows improvement.");
  });

  it("includes user reply", () => {
    const result = buildGenerativeDebateContinuePrompt(input);
    expect(result).toContain("Let me clarify my position on subsidies.");
  });

  it("includes geopolitics suffix when flagged", () => {
    const result = buildGenerativeDebateContinuePrompt({ ...input, isGeopolitics: true });
    expect(result).toContain("actor motivations");
  });
});
