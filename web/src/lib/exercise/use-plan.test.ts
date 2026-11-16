import { describe, expect, it } from "vitest";
import { dueUseChecks, type UsePlanRow } from "./use-plan";

const row = (id: string, day: string, extra: Partial<UsePlanRow> = {}): UsePlanRow => ({
  id,
  title: id,
  completedAt: `${day}T12:00:00`,
  usePlan: "In Friday's planning meeting",
  ...extra,
});

describe("dueUseChecks", () => {
  it("asks 7 days after the exercise, not before", () => {
    const rows = [row("a", "2026-11-01")];
    expect(dueUseChecks(rows, "2026-11-07")).toEqual([]);
    expect(dueUseChecks(rows, "2026-11-08").map((r) => r.id)).toEqual(["a"]);
  });

  it("skips rows with no plan, an answered check, or no finish date", () => {
    const rows = [
      row("none", "2026-11-01", { usePlan: "  " }),
      row("answered", "2026-11-01", { useCheck: { result: "yes", note: "", at: "2026-11-08T08:00:00Z" } }),
      row("open", "2026-11-01", { completedAt: null }),
    ];
    expect(dueUseChecks(rows, "2026-11-10")).toEqual([]);
  });

  it("drops a question nobody answered for three more weeks", () => {
    const rows = [row("old", "2026-10-01")];
    expect(dueUseChecks(rows, "2026-10-29").map((r) => r.id)).toEqual(["old"]);
    expect(dueUseChecks(rows, "2026-10-30")).toEqual([]);
  });

  it("returns the oldest first", () => {
    const rows = [row("b", "2026-11-03"), row("a", "2026-11-01")];
    expect(dueUseChecks(rows, "2026-11-12").map((r) => r.id)).toEqual(["a", "b"]);
  });
});
