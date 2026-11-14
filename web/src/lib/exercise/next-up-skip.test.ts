import { describe, expect, it } from "vitest";

import { isSkippedToday } from "./next-up-skip";

describe("isSkippedToday", () => {
  it("hides the step only on the day it was skipped", () => {
    expect(isSkippedToday("2026-11-14", "2026-11-14")).toBe(true);
    expect(isSkippedToday("2026-11-13", "2026-11-14")).toBe(false);
    expect(isSkippedToday(null, "2026-11-14")).toBe(false);
  });
});
