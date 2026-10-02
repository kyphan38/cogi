import { describe, expect, it } from "vitest";
import type { EmbeddedIssue, TagType, UserHighlight, ValidPoint } from "@/lib/types/exercise";
import { analyticalCoachingRefs, scoreAnalytical } from "@/lib/exercise/analytical-score";
import { ANALYTICAL_TAG_OPTIONS, GEOPOLITICS_TAG_OPTIONS } from "@/lib/exercise/tag-labels";
import { buildAnalyticalPerspectivePrompt } from "./analytical-perspective";

const passage =
  "If you do not run at dawn, you will never gain the discipline needed for high pay. A study of 12 founders proves the habit works. Saving 10% of income builds a buffer. Our plan is the only sensible choice. Costs fell last year.";

const embeddedIssues: EmbeddedIssue[] = [
  { description: "d", type: "logical_fallacy", severity: "obvious", textSegment: "you will never gain the discipline needed for high pay", explanation: "Only two options are offered." },
  { description: "d", type: "weak_evidence", severity: "moderate", textSegment: "A study of 12 founders proves the habit works", explanation: "Twelve people prove nothing." },
  { description: "d", type: "hidden_assumption", severity: "moderate", textSegment: "Saving 10% of income builds a buffer", explanation: "e" },
  { description: "d", type: "bias", severity: "subtle", textSegment: "Our plan is the only sensible choice", explanation: "The writer sells the plan." },
];
const validPoints: ValidPoint[] = [
  { textSegment: "Costs fell last year", explanation: "Stated as a plain fact." },
  { textSegment: "builds a buffer", explanation: "e" },
];

function hl(text: string, tag: TagType, id = text): UserHighlight {
  const start = passage.indexOf(text);
  return { id, startOffset: start, endOffset: start + text.length, text, tag };
}

function build(highlights: UserHighlight[], extra: Partial<Parameters<typeof buildAnalyticalPerspectivePrompt>[0]> = {}) {
  const result = scoreAnalytical({ passage, embeddedIssues, validPoints, highlights });
  return buildAnalyticalPerspectivePrompt({
    title: "A daily routine plan",
    passage,
    embeddedIssues,
    validPoints,
    userHighlights: highlights,
    result,
    requiredRefs: analyticalCoachingRefs(result, highlights).required,
    confidenceBefore: 70,
    domain: "personal growth",
    tagOptions: ANALYTICAL_TAG_OPTIONS,
    ...extra,
  });
}

describe("buildAnalyticalPerspectivePrompt", () => {
  it("includes title, passage, domain and the v3 output contract", () => {
    const p = build([]);
    expect(p).toContain("A daily routine plan");
    expect(p).toContain(passage);
    expect(p).toContain("personal growth");
    expect(p).toContain('"perspectiveFormat": "analytical_v3"');
    expect(p).toContain("nextTimeAsk");
  });

  it("drops the old contract: no suitableFor, no forced stronger alternative", () => {
    const p = build([]);
    expect(p).not.toContain("clarity_v2");
    expect(p).not.toContain("suitableFor");
    expect(p).not.toContain("remediationAlternative");
  });

  it("states each verdict decided by code", () => {
    const p = build([
      hl("you will never gain the discipline needed for high pay", "logical_fallacy"),
      hl("A study of 12 founders proves the habit works", "bias"),
      hl("Our plan is the only sensible choice", "valid_point"),
      hl("Costs fell last year", "weak_evidence"),
    ]);
    expect(p).toContain('CORRECT - found it and tagged it "Logical Fallacy"');
    expect(p).toContain('FOUND, DIFFERENT TAG - found it but tagged it "Bias / Motivated Reasoning"; the planned tag is "Weak Evidence"');
    expect(p).toContain("MISSED - highlighted it but marked it as Valid Point");
    expect(p).toContain('TRAPPED - tagged this sound statement as "Weak Evidence"');
    expect(p).toContain("Found 2 of 4 planned issues; 1 with the planned tag.");
  });

  it("lists the refs that need an item", () => {
    const p = build([hl("Costs fell last year", "bias")]);
    expect(p).toContain("Write one item for each of these refs: issue_1, issue_2, issue_3, issue_4, decoy_1.");
  });

  it("describes an unplanned highlight as an extra case", () => {
    // The space between two sentences belongs to neither, so it matches nothing.
    const at = passage.indexOf(" A study");
    const gap: UserHighlight = { id: "gap", startOffset: at, endOffset: at + 1, text: "pay", tag: "bias" };
    const p = build([gap]);
    expect(p).toContain('extra_1 - the user\'s own highlight');
    expect(p).toContain('User highlighted: "pay" and tagged it "Bias / Motivated Reasoning".');
    expect(p).toContain("issue_4, extra_1.");
  });

  it("leaves out unplanned sentences the user marked fine or unsure", () => {
    const at = passage.indexOf(" A study");
    const fine: UserHighlight = { id: "f", startOffset: at, endOffset: at + 1, text: "gap", tag: "valid_point" };
    expect(build([fine])).not.toContain("extra_1");
  });

  it("gives the check question for each plain tag, not the geopolitics ones", () => {
    const p = build([]);
    expect(p).toContain("- Weak Evidence: Is there real evidence here, or only a claim?");
    expect(p).not.toContain("Missing Actor");
  });

  it("asks for a metaNote and uses geopolitics tags when a hidden perspective is set", () => {
    const p = build([], {
      tagOptions: GEOPOLITICS_TAG_OPTIONS,
      hiddenPerspective: "US-aligned think tank",
      missingActors: ["Vietnam"],
    });
    expect(p).toContain("PERSPECTIVE GUESS (geopolitics)");
    expect(p).toContain("US-aligned think tank");
    expect(p).toContain('"metaNote": string');
    expect(p).toContain("- Missing Actor / Perspective: Who is affected but never mentioned?");
  });

  it("omits the perspective block for plain passages", () => {
    expect(build([])).not.toContain("PERSPECTIVE GUESS");
  });
});
