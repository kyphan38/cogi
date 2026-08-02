import { describe, expect, it } from "vitest";
import { buildPerspectiveDisagreePrompt } from "./disagree";

describe("buildPerspectiveDisagreePrompt", () => {
  const base = {
    kind: "analytical" as const,
    exerciseTitle: "Supply Chain Analysis",
    section: "highlightCritiques" as const,
    pointBody: "The claim about cost reduction is overstated.",
    userReason: "I think the data supports the claim.",
  };

  it("includes exercise metadata", () => {
    const result = buildPerspectiveDisagreePrompt(base);
    expect(result).toContain("analytical");
    expect(result).toContain("Supply Chain Analysis");
  });

  it("includes point body and user reason", () => {
    const result = buildPerspectiveDisagreePrompt(base);
    expect(result).toContain("The claim about cost reduction is overstated.");
    expect(result).toContain("I think the data supports the claim.");
  });

  it("includes domain when provided", () => {
    const result = buildPerspectiveDisagreePrompt({ ...base, domain: "logistics" });
    expect(result).toContain("Domain: logistics");
  });

  it("omits domain line when not provided", () => {
    const result = buildPerspectiveDisagreePrompt(base);
    expect(result).not.toContain("Domain:");
  });

  it("uses (untitled point) when pointTitle is null", () => {
    const result = buildPerspectiveDisagreePrompt({ ...base, pointTitle: null });
    expect(result).toContain("(untitled point)");
  });

  it("uses pointTitle when provided", () => {
    const result = buildPerspectiveDisagreePrompt({ ...base, pointTitle: "Cost Claim" });
    expect(result).toContain("Cost Claim");
  });

  it("includes word count and format instructions", () => {
    const result = buildPerspectiveDisagreePrompt(base);
    expect(result).toContain("120–220 words");
    expect(result).toContain("plain text");
  });

  it("includes NO_INDEX_REFERENCE_RULE content", () => {
    const result = buildPerspectiveDisagreePrompt(base);
    expect(result).toContain("PROHIBITION");
  });

  it("omits the conversation block when there are no prior turns", () => {
    const result = buildPerspectiveDisagreePrompt(base);
    expect(result).not.toContain("Conversation so far");
  });

  it("includes prior turns as a conversation transcript when provided", () => {
    const result = buildPerspectiveDisagreePrompt({
      ...base,
      priorTurns: [
        { userReason: "First round reason", aiReply: "First round reply" },
        { userReason: "Second round reason", aiReply: "Second round reply" },
      ],
    });
    expect(result).toContain("Conversation so far");
    expect(result).toContain("First round reason");
    expect(result).toContain("First round reply");
    expect(result).toContain("Second round reason");
    expect(result).toContain("Second round reply");
  });
});
