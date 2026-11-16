import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/types/exercise";
import { perspectiveKindForExercise, startOfWeekMonday, typeSwatchClass } from "./history";

const ex = (patch: Record<string, unknown>) => patch as unknown as Exercise;

describe("startOfWeekMonday", () => {
  it("goes back to Monday 00:00, and keeps a Monday as is", () => {
    const sun = startOfWeekMonday(new Date(2026, 10, 15, 21, 30));
    expect([sun.getFullYear(), sun.getMonth(), sun.getDate(), sun.getHours()]).toEqual([2026, 10, 9, 0]);
    const mon = startOfWeekMonday(new Date(2026, 10, 16, 8));
    expect(mon.getDate()).toBe(16);
    expect(mon.getMinutes()).toBe(0);
  });
});

describe("perspectiveKindForExercise", () => {
  it("maps the three clarity types and their variants", () => {
    expect(perspectiveKindForExercise(ex({ type: "analytical" }))).toBe("analytical");
    expect(perspectiveKindForExercise(ex({ type: "systems" }))).toBe("systems");
    expect(perspectiveKindForExercise(ex({ type: "evaluative", variant: "matrix" }))).toBe("evaluative-matrix");
    expect(perspectiveKindForExercise(ex({ type: "evaluative", variant: "scoring" }))).toBe("evaluative-scoring");
  });
  it("returns null for other types", () => {
    expect(perspectiveKindForExercise(ex({ type: "judgment" }))).toBeNull();
  });
});

describe("typeSwatchClass", () => {
  it("gives each main type its own gray step", () => {
    const classes = ["evaluative", "systems", "analytical", "judgment"].map((t) => typeSwatchClass(t as Exercise["type"]));
    expect(new Set(classes).size).toBe(4);
  });
});
