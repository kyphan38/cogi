import { describe, expect, it } from "vitest";
import { evaluatePromotionGate } from "./promotion-gate";

function fullyValidInput() {
  return {
    draftExists: true,
    verifierFileExists: true,
    verifierHasSentinel: false,
    verifierPassed: true,
    auditPass: true,
    auditFailures: [] as string[],
    confirmed: true,
  };
}

describe("evaluatePromotionGate", () => {
  it("allows promotion when every gate passes", () => {
    const result = evaluatePromotionGate(fullyValidInput());
    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("refuses when the draft does not exist", () => {
    const result = evaluatePromotionGate({ ...fullyValidInput(), draftExists: false });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("No draft file"))).toBe(true);
  });

  it("refuses when there is no verifier file", () => {
    const result = evaluatePromotionGate({
      ...fullyValidInput(),
      verifierFileExists: false,
      verifierPassed: null,
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("Monte Carlo verifier"))).toBe(true);
  });

  it("refuses when the verifier stub was never filled in (sentinel still present)", () => {
    const result = evaluatePromotionGate({
      ...fullyValidInput(),
      verifierHasSentinel: true,
      verifierPassed: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("NOT_IMPLEMENTED_VERIFY_THIS_DRAFT"))).toBe(true);
  });

  it("refuses when the verifier ran but failed", () => {
    const result = evaluatePromotionGate({ ...fullyValidInput(), verifierPassed: false });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("Verifier did not pass"))).toBe(true);
  });

  it("refuses when the automated audit fails", () => {
    const result = evaluatePromotionGate({
      ...fullyValidInput(),
      auditPass: false,
      auditFailures: ["Option label leaks the answer"],
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("Automated audit failed") && r.includes("leaks the answer"))).toBe(
      true,
    );
  });

  it("refuses when the human did not pass --confirm, even if every other gate passes", () => {
    const result = evaluatePromotionGate({ ...fullyValidInput(), confirmed: false });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("--confirm"))).toBe(true);
  });

  it("accumulates every failing reason at once, not just the first", () => {
    const result = evaluatePromotionGate({
      draftExists: false,
      verifierFileExists: false,
      verifierHasSentinel: false,
      verifierPassed: null,
      auditPass: false,
      auditFailures: ["bad label"],
      confirmed: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.length).toBe(4);
  });
});
