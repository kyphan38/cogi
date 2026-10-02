import { describe, expect, it } from "vitest";
import type { AnalyticalResult } from "@/lib/types/exercise";
import { rateAnalytical } from "./analytical-levels";
import { isPracticeLevel, suggestLevelChange } from "./levels";

describe("suggestLevelChange", () => {
  it("suggests the next level after 3 good results in a row", () => {
    expect(suggestLevelChange("guided", ["good", "good", "good"])).toEqual({ direction: "up", to: "standard" });
    expect(suggestLevelChange("standard", ["good", "good", "good", "poor"])).toEqual({ direction: "up", to: "expert" });
  });

  it("needs the 3 newest to be good", () => {
    expect(suggestLevelChange("guided", ["good", "ok", "good", "good"])).toBeNull();
    expect(suggestLevelChange("guided", ["good", "good"])).toBeNull();
  });

  it("suggests the level below after 2 poor results in a row", () => {
    expect(suggestLevelChange("expert", ["poor", "poor"])).toEqual({ direction: "down", to: "standard" });
  });

  it("never goes past the ends", () => {
    expect(suggestLevelChange("expert", ["good", "good", "good"])).toBeNull();
    expect(suggestLevelChange("guided", ["poor", "poor"])).toBeNull();
  });
});

describe("isPracticeLevel", () => {
  it("accepts only the three levels", () => {
    expect(["guided", "standard", "expert", "hard", 1].map(isPracticeLevel)).toEqual([true, true, true, false, false]);
  });
});

describe("rateAnalytical", () => {
  const base: AnalyticalResult = {
    issues: [], decoys: [], extraHighlightIds: [],
    found: 0, total: 4, tagsCorrect: 0, trapsHit: 0, decoyTotal: 2,
  };

  it("rates 3 of 4 found with at most one trap as good", () => {
    expect(rateAnalytical({ ...base, found: 3, trapsHit: 1 })).toBe("good");
    expect(rateAnalytical({ ...base, found: 4 })).toBe("good");
  });

  it("rates 3 of 4 found with both traps hit as ok", () => {
    expect(rateAnalytical({ ...base, found: 3, trapsHit: 2 })).toBe("ok");
  });

  it("rates at most 1 of 4 found as poor", () => {
    expect(rateAnalytical({ ...base, found: 1 })).toBe("poor");
    expect(rateAnalytical({ ...base, found: 2 })).toBe("ok");
  });

  it("rates a sound-reasoning passage on traps", () => {
    const sound = { ...base, total: 0 };
    expect(rateAnalytical(sound)).toBe("good");
    expect(rateAnalytical({ ...sound, trapsHit: 1 })).toBe("ok");
    expect(rateAnalytical({ ...sound, trapsHit: 2 })).toBe("poor");
  });
});
