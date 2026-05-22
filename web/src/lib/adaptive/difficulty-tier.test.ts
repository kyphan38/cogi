import { describe, expect, it } from "vitest";
import { accuracyToTierLabel } from "./difficulty-tier";

describe("accuracyToTierLabel", () => {
  it("returns Foundation for accuracy below 52", () => {
    expect(accuracyToTierLabel(0)).toBe("Foundation");
    expect(accuracyToTierLabel(51)).toBe("Foundation");
  });

  it("returns Practitioner for accuracy 52-66", () => {
    expect(accuracyToTierLabel(52)).toBe("Practitioner");
    expect(accuracyToTierLabel(66)).toBe("Practitioner");
  });

  it("returns Advanced for accuracy 67-81", () => {
    expect(accuracyToTierLabel(67)).toBe("Advanced");
    expect(accuracyToTierLabel(81)).toBe("Advanced");
  });

  it("returns Expert for accuracy 82+", () => {
    expect(accuracyToTierLabel(82)).toBe("Expert");
    expect(accuracyToTierLabel(100)).toBe("Expert");
  });

  it("handles boundary values correctly", () => {
    expect(accuracyToTierLabel(51.9)).toBe("Foundation");
    expect(accuracyToTierLabel(52)).toBe("Practitioner");
    expect(accuracyToTierLabel(66.9)).toBe("Practitioner");
    expect(accuracyToTierLabel(67)).toBe("Advanced");
    expect(accuracyToTierLabel(81.9)).toBe("Advanced");
    expect(accuracyToTierLabel(82)).toBe("Expert");
  });
});
