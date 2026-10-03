import { describe, expect, it } from "vitest";
import type { EmbeddedIssue, ValidPoint } from "@/lib/types/exercise";
import { buildAnalyticalDeepDivePrompt, resolveDeepDiveRef } from "./analytical-deep-dive";

const embeddedIssues: EmbeddedIssue[] = [
  { description: "d", type: "logical_fallacy", severity: "obvious", textSegment: "separate accounts prove they do not trust each other", explanation: "Only two options." },
];
const validPoints: ValidPoint[] = [{ textSegment: "tracking spending for ninety days helps", explanation: "Modest expert claim." }];
const base = { title: "Money and couples", domain: "personal finance", passage: "A passage." };

describe("resolveDeepDiveRef", () => {
  it("finds issues and sound statements by 1-based ref", () => {
    expect(resolveDeepDiveRef("issue_1", embeddedIssues, validPoints)).toMatchObject({ kind: "issue", index: 0 });
    expect(resolveDeepDiveRef("decoy_1", embeddedIssues, validPoints)).toMatchObject({ kind: "decoy", index: 0 });
  });

  it("returns null for unknown or out-of-range refs", () => {
    expect(resolveDeepDiveRef("issue_2", embeddedIssues, validPoints)).toBeNull();
    expect(resolveDeepDiveRef("extra_1", embeddedIssues, validPoints)).toBeNull();
    expect(resolveDeepDiveRef("issue_0", embeddedIssues, validPoints)).toBeNull();
  });
});

describe("buildAnalyticalDeepDivePrompt", () => {
  it("explains an issue with its tag, subtype, the seen why and blocked names", () => {
    const target = resolveDeepDiveRef("issue_1", embeddedIssues, validPoints)!;
    const p = buildAnalyticalDeepDivePrompt({ ...base, target, why: "It offers only two options.", subtypeName: "False dilemma" });
    expect(p).toContain('The sentence: "separate accounts prove they do not trust each other"');
    expect(p).toContain('Tag: "Logical Fallacy"');
    expect(p).toContain("More specific kind: False dilemma.");
    expect(p).toContain("It offers only two options.");
    expect(p).toContain('Never use these names: "Logical Fallacy"');
    expect(p).toContain('"False dilemma"');
    expect(p).toContain("Vietnamese name in brackets");
  });

  it("explains a sound statement without other names", () => {
    const target = resolveDeepDiveRef("decoy_1", embeddedIssues, validPoints)!;
    const p = buildAnalyticalDeepDivePrompt({ ...base, target });
    expect(p).toContain("It is a SOUND statement.");
    expect(p).toContain('"alsoCalled": always [].');
    expect(p).not.toContain("Short explanation the learner already saw");
  });
});
