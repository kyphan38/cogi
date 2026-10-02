import { describe, expect, it } from "vitest";
import { NO_INDEX_REFERENCE_RULE } from "./perspective-clarity-directives";

describe("NO_INDEX_REFERENCE_RULE", () => {
  it("forbids referring to user input by index or id alone", () => {
    expect(NO_INDEX_REFERENCE_RULE).toContain("PROHIBITION");
    expect(NO_INDEX_REFERENCE_RULE).toContain("never the id");
  });
});
