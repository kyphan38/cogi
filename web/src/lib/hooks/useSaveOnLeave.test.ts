import { describe, expect, it, vi } from "vitest";
import { createPendingSave } from "./useSaveOnLeave";

describe("createPendingSave", () => {
  it("flush runs only the newest pending save, once", () => {
    const p = createPendingSave();
    const first = vi.fn();
    const second = vi.fn();
    p.set(first);
    p.set(second);
    p.flush();
    p.flush();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("clear drops the pending save (finished exercises are never rewritten)", () => {
    const p = createPendingSave();
    const save = vi.fn();
    p.set(save);
    p.clear();
    p.flush();
    expect(save).not.toHaveBeenCalled();
  });
});
