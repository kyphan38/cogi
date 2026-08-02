import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { highlightTerms } from "./highlight-terms";

function marks(nodes: ReturnType<typeof highlightTerms>) {
  return nodes.filter(isValidElement) as { props: { children: string } }[];
}

describe("highlightTerms", () => {
  it("returns the plain text unchanged when no terms are given", () => {
    const result = highlightTerms("Nothing to highlight here.", []);
    expect(result).toEqual(["Nothing to highlight here."]);
  });

  it("highlights a single case-insensitive match", () => {
    const result = highlightTerms("You scored speed to market highly.", ["Speed to Market"]);
    const highlighted = marks(result);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]!.props.children).toBe("speed to market");
  });

  it("does not highlight terms that aren't present", () => {
    const result = highlightTerms("A generic sentence with no matches.", ["Risk", "Cost"]);
    expect(marks(result)).toHaveLength(0);
    expect(result.join("")).toBe("A generic sentence with no matches.");
  });

  it("prefers the longer overlapping term", () => {
    const result = highlightTerms(
      "We should focus on Cost Efficiency this quarter.",
      ["Cost", "Cost Efficiency"],
    );
    const highlighted = marks(result);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]!.props.children).toBe("Cost Efficiency");
  });

  it("highlights multiple distinct terms in the same text", () => {
    const result = highlightTerms(
      "Compare 'Speed to Market' against 'Internal Transition via Enterprise Upskilling'.",
      ["Speed to Market", "Internal Transition via Enterprise Upskilling"],
    );
    expect(marks(result)).toHaveLength(2);
  });

  it("escapes regex metacharacters in terms", () => {
    const result = highlightTerms("Choose Plan A (v2) for this scenario.", ["Plan A (v2)"]);
    const highlighted = marks(result);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]!.props.children).toBe("Plan A (v2)");
  });

  it("handles empty text", () => {
    const result = highlightTerms("", ["Risk"]);
    expect(marks(result)).toHaveLength(0);
  });

  it("ignores blank/whitespace-only terms", () => {
    const result = highlightTerms("Some text here.", ["  ", ""]);
    expect(result).toEqual(["Some text here."]);
  });
});
