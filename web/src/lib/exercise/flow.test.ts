import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPendingSave } from "@/lib/hooks/useSaveOnLeave";
import { isJudgmentExercise, type Exercise } from "@/lib/types/exercise";
import { commonResumeState, resumableRow, scheduleSave } from "./flow";

const row = (patch: Record<string, unknown>) => ({ id: "x", type: "judgment", completedAt: null, ...patch }) as unknown as Exercise;

describe("resumableRow", () => {
  it("returns an unfinished row of the right type", () => {
    const r = row({});
    expect(resumableRow(r, isJudgmentExercise)).toBe(r);
  });

  it("refuses a missing, finished or other-type row", () => {
    expect(resumableRow(undefined, isJudgmentExercise)).toBeNull();
    expect(resumableRow(row({ completedAt: "2026-11-15T00:00:00Z" }), isJudgmentExercise)).toBeNull();
    expect(resumableRow(row({ type: "reframe" }), isJudgmentExercise)).toBeNull();
  });
});

describe("commonResumeState", () => {
  it("falls back to the defaults for an old or empty row", () => {
    expect(commonResumeState({})).toEqual({ confidence: 50, takeaway: "", perspectiveStructured: undefined });
    expect(commonResumeState({ confidenceBefore: null, takeaway: null, aiPerspectiveStructured: null })).toEqual({
      confidence: 50,
      takeaway: "",
      perspectiveStructured: undefined,
    });
  });

  it("keeps saved values, including a confidence of 0", () => {
    expect(commonResumeState({ confidenceBefore: 0, takeaway: "Ask first." })).toMatchObject({
      confidence: 0,
      takeaway: "Ask first.",
    });
  });
});

describe("scheduleSave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves once after the delay and leaves nothing pending", () => {
    const pending = createPendingSave();
    const save = vi.fn();
    scheduleSave(pending, save, 1000);
    vi.advanceTimersByTime(999);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    pending.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("cancel stops the timer but leaving the page still saves", () => {
    const pending = createPendingSave();
    const save = vi.fn();
    const cancel = scheduleSave(pending, save, 1000);
    cancel();
    vi.advanceTimersByTime(5000);
    expect(save).not.toHaveBeenCalled();
    pending.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("a newer edit replaces the pending save", () => {
    const pending = createPendingSave();
    const first = vi.fn();
    const second = vi.fn();
    scheduleSave(pending, first, 1000)();
    scheduleSave(pending, second, 1000);
    pending.flush();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
