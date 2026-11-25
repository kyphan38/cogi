import { describe, expect, it } from "vitest";
import { OWN_TYPES } from "./adaptive";
import { ownPrompts } from "./own-prompts";

describe("ownPrompts", () => {
  it("gives two or three short ideas for every type a track can make own", () => {
    for (const t of OWN_TYPES) {
      const p = ownPrompts(t);
      expect(p.length).toBeGreaterThanOrEqual(2);
      expect(p.length).toBeLessThanOrEqual(3);
      for (const line of p) expect(line.split(" ").length).toBeLessThanOrEqual(10);
    }
  });
});
