import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { bumpHint, hintStage, parseHintCounts } from "./hint";
import { STEP_GOALS, stepGoal } from "./step-goals";
import { whereItWent } from "./where-it-went";

describe("hintStage", () => {
  it("shows full 3 times, short 3 times, then nothing", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map((n) => hintStage(n))).toEqual([
      "full",
      "full",
      "full",
      "short",
      "short",
      "short",
      "gone",
      "gone",
    ]);
    expect(hintStage(1, false)).toBe("gone");
  });
});

describe("hint counts", () => {
  it("keeps positive numbers and drops the rest", () => {
    expect(parseHintCounts(null)).toEqual({});
    expect(parseHintCounts("nope")).toEqual({});
    expect(parseHintCounts("[1]")).toEqual({});
    expect(parseHintCounts('{"a":2,"b":"x","c":-1,"d":3.7}')).toEqual({
      a: 2,
      d: 3,
    });
  });

  it("adds one and stops once the hint is gone", () => {
    expect(bumpHint({}, "a")).toEqual({ a: 1 });
    const gone = { a: 7 };
    expect(bumpHint(gone, "a")).toBe(gone);
  });
});

describe("step goals", () => {
  // Every work label a flow passes to practiceStepLabels("...") needs a goal.
  const root = join(__dirname, "../../components/exercises");
  const labels = readdirSync(root, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".tsx"))
    .flatMap((f) =>
      [
        ...readFileSync(join(root, f), "utf8").matchAll(
          /practiceStepLabels\("([^"]+)"\)/g,
        ),
      ].map((m) => m[1]!),
    );

  it("covers setup, feedback and every work step", () => {
    expect(labels.length).toBeGreaterThan(5);
    for (const label of ["Setup", "AI feedback", ...labels])
      expect(stepGoal(label), label).not.toBeNull();
  });

  it("keeps each line short", () => {
    for (const { full, short } of Object.values(STEP_GOALS)) {
      expect(full.split(" ").length).toBeLessThanOrEqual(10);
      expect(short.split(" ").length).toBeLessThanOrEqual(3);
    }
  });
});

describe("whereItWent", () => {
  it("lists the exercise, and the plan only when there is one", () => {
    expect(
      whereItWent({ today: "2026-11-27", usePlan: "  " }).map((r) => [
        r.where,
        r.back,
      ]),
    ).toEqual([["Past exercises", "2026-12-27"]]);
    expect(
      whereItWent({ today: "2026-11-27", usePlan: "standup" }).map((r) => [
        r.where,
        r.back,
      ]),
    ).toEqual([
      ["Past exercises", "2026-12-27"],
      ["Today", "2026-12-04"],
    ]);
  });
});
