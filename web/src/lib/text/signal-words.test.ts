import { describe, expect, it } from "vitest";
import { hasSignalWord } from "./signal-words";

describe("hasSignalWord", () => {
  it("finds extreme words as whole words, in any case", () => {
    expect(hasSignalWord("This PROVES the plan works.")).toBe(true);
    expect(hasSignalWord("No one complained.")).toBe(true);
    expect(hasSignalWord("Prices never drop here.")).toBe(true);
  });

  it("ignores the same letters inside other words", () => {
    expect(hasSignalWord("We allowed a small budget for the mustard stall.")).toBe(false);
    expect(hasSignalWord("Sales rose 4% after the change.")).toBe(false);
  });
});
