import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";

const at = (y: number, m: number, d: number, h = 12) => ({ completedAt: new Date(y, m - 1, d, h).toISOString() });
const now = new Date(2026, 9, 2, 15);

describe("computeStreak", () => {
  it("is 0 with no completed exercises", () => {
    expect(computeStreak([], now)).toBe(0);
    expect(computeStreak([{ completedAt: null }], now)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak([at(2026, 10, 2), at(2026, 10, 1), at(2026, 9, 30), at(2026, 9, 28)], now)).toBe(3);
  });

  it("still counts a streak that ended yesterday", () => {
    expect(computeStreak([at(2026, 10, 1), at(2026, 9, 30)], now)).toBe(2);
  });

  it("is 0 when the last practice was two days ago", () => {
    expect(computeStreak([at(2026, 9, 30)], now)).toBe(0);
  });

  it("counts several exercises on one day once", () => {
    expect(computeStreak([at(2026, 10, 2, 9), at(2026, 10, 2, 20)], now)).toBe(1);
  });
});
