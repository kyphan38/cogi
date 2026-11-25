import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/types/exercise";
import { activityByDay, activityLevel, activitySwatchClass, perspectiveKindForExercise, startOfWeekMonday } from "./history";

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

describe("activityByDay", () => {
  it("groups finished rows by local day, newest first, and skips unfinished ones", () => {
    const at = (d: number, h: number) => new Date(2026, 10, d, h).toISOString();
    const days = activityByDay([
      ex({ id: "a", completedAt: at(24, 9) }),
      ex({ id: "b", completedAt: at(25, 8) }),
      ex({ id: "c", completedAt: at(25, 20) }),
      ex({ id: "d", completedAt: null }),
    ]);
    expect([...days.keys()]).toEqual(["2026-11-25", "2026-11-24"]);
    expect(days.get("2026-11-25")!.map((e) => e.id)).toEqual(["c", "b"]);
    expect(days.get("2026-11-24")!.map((e) => e.id)).toEqual(["a"]);
  });
});

describe("activityLevel", () => {
  it("caps at three and gives each step its own gray", () => {
    expect([0, 1, 2, 3, 7].map(activityLevel)).toEqual([0, 1, 2, 3, 3]);
    const classes = ([0, 1, 2, 3] as const).map(activitySwatchClass);
    expect(new Set(classes).size).toBe(4);
  });
});
