import { describe, expect, it } from "vitest";
import { parseHumorExerciseJson } from "./humor";
import { parseJudgmentExerciseJson } from "./judgment";
import { parseReframeExerciseJson } from "./reframe";
import { parseTrickyExerciseJson } from "./tricky";

// The real answer that used to fail (ai-evals, cogi/reframe:own-heavy, 2026-11-28).
const REFRAME_CONCERN = JSON.stringify({
  safety: "concern",
  title: "",
  scenario: "",
  concepts: [],
  conceptChecks: [],
  thoughts: [],
  rewrite: { question: "", options: ["", "", ""], answerIndex: 0, explanation: "", thoughtId: "", balancedExample: "" },
});
// Placeholder items with empty text, which the strict schemas reject.
const placeholder = { question: "", trap: "", trapWhy: "", moment: "", serious: false, options: [] };

const parsers = {
  reframe: parseReframeExerciseJson,
  judgment: parseJudgmentExerciseJson,
  humor: parseHumorExerciseJson,
  tricky: parseTrickyExerciseJson,
};

describe("safety concern answers", () => {
  it("reframe accepts the concern answer with an empty rewrite", () => {
    const r = parseReframeExerciseJson(REFRAME_CONCERN);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.safety).toBe("concern");
  });

  for (const [name, parse] of Object.entries(parsers)) {
    it(`${name} accepts a concern with placeholder fields`, () => {
      const r = parse(JSON.stringify({ safety: "concern", title: "", rounds: [placeholder], conceptChecks: [{ question: "" }] }));
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.safety).toBe("concern");
    });

    it(`${name} still rejects an "ok" answer with missing parts`, () => {
      expect(parse(JSON.stringify({ safety: "ok", title: "" })).success).toBe(false);
    });
  }
});
