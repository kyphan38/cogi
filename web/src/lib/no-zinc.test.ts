import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Colors come from the theme tokens (DESIGN.md), not Tailwind's zinc scale or raw white.
const SRC = join(__dirname, "..");
const BANNED = /(?<![\w-])(?:[a-z]+-zinc-\d+|(?:bg|text|border)-white)(?![\w-])/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|css)$/.test(name) && !name.endsWith(".test.ts") ? [p] : [];
  });
}

describe("no zinc or raw white classes", () => {
  it("uses theme tokens only", () => {
    const hits = files(SRC).flatMap((p) =>
      readFileSync(p, "utf8")
        .split("\n")
        .map((line, i) => (BANNED.test(line) ? `${p.slice(SRC.length + 1)}:${i + 1}` : null))
        .filter((x): x is string => x !== null),
    );
    expect(hits).toEqual([]);
  });
});
