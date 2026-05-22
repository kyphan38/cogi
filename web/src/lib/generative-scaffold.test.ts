import { describe, expect, it } from "vitest";
import { getGenerativeStageFromCompletedCount } from "./generative-scaffold";

describe("getGenerativeStageFromCompletedCount", () => {
  it("returns 'edit' for 0 completed", () => {
    expect(getGenerativeStageFromCompletedCount(0)).toBe("edit");
  });

  it("returns 'edit' for 1-2 completed", () => {
    expect(getGenerativeStageFromCompletedCount(1)).toBe("edit");
    expect(getGenerativeStageFromCompletedCount(2)).toBe("edit");
  });

  it("returns 'hint' at exactly 3 completed", () => {
    expect(getGenerativeStageFromCompletedCount(3)).toBe("hint");
  });

  it("returns 'hint' for 4-6 completed", () => {
    expect(getGenerativeStageFromCompletedCount(4)).toBe("hint");
    expect(getGenerativeStageFromCompletedCount(5)).toBe("hint");
    expect(getGenerativeStageFromCompletedCount(6)).toBe("hint");
  });

  it("returns 'independent' at exactly 7 completed", () => {
    expect(getGenerativeStageFromCompletedCount(7)).toBe("independent");
  });

  it("returns 'independent' for large counts", () => {
    expect(getGenerativeStageFromCompletedCount(100)).toBe("independent");
    expect(getGenerativeStageFromCompletedCount(999)).toBe("independent");
  });
});
