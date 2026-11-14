import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Text uses the five sizes in globals.css (text-page, -lead, -body, -meta, -label).
const SRC = join(__dirname, "..");
const BANNED = /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl|\[\d)/;

// Kept on purpose: inputs stay 16px on phones so iOS does not zoom on focus;
// the nav is 14px (DESIGN.md nav table); dense tool boards keep their own sizes.
const EXEMPT = [
  "components/ui/input.tsx",
  "components/ui/textarea.tsx",
  "components/shell/AppTopNav.tsx",
  "components/exercises/EvaluativeMatrixBoard.tsx",
  "components/exercises/PayoffMatrix.tsx",
  "components/exercises/SystemsFlowCanvas.tsx",
  "components/geo/GeoMap.tsx",
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [p] : [];
  });
}

describe("type scale", () => {
  it("uses only the five sizes outside the exempt files", () => {
    const hits = files(SRC)
      .filter((p) => !EXEMPT.includes(p.slice(SRC.length + 1)))
      .flatMap((p) =>
        readFileSync(p, "utf8")
          .split("\n")
          .map((line, i) => (BANNED.test(line) ? `${p.slice(SRC.length + 1)}:${i + 1}` : null))
          .filter((x): x is string => x !== null),
      );
    expect(hits).toEqual([]);
  });
});
