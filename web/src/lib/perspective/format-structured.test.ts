import { describe, expect, it } from "vitest";
import {
  PERSPECTIVE_UI_SECTIONS,
  getStructuredPerspectiveSections,
  getClarityPerspectiveViewModel,
  getPerspectiveViewModel,
  structuredPerspectiveToMarkdown,
} from "./format-structured";
import type {
  LegacyPerspectiveStructured,
  AnalyticalPerspectiveStructured,
  SystemsPerspectiveStructured,
  EvaluativeMatrixPerspectiveStructured,
  EvaluativeScoringPerspectiveStructured,
  GenerativePerspectiveStructured,
} from "@/lib/types/perspective";

const legacyPerspective: LegacyPerspectiveStructured = {
  embedded: [{ id: "e1", title: "Bias", body: "Confirmation bias present" }],
  userFound: [{ id: "u1", body: "Found a fallacy" }],
  additional: [{ id: "a1", title: "Consider", body: "Alternative view" }],
  openQuestions: [{ id: "q1", body: "What about X?" }],
};

const analyticalPerspective: AnalyticalPerspectiveStructured = {
  perspectiveFormat: "clarity_v2",
  title: "Analytical Review",
  suitableFor: "Critical analysis practice",
  highlightCritiques: [
    { id: "hc1", userTextSnippet: "the claim that...", critique: "Weak evidence", remediationAlternative: "Cite source" },
    { userTextSnippet: "another claim", critique: "Missing context", remediationAlternative: "Add context" },
  ],
  openQuestions: ["How does this apply?"],
};

const systemsPerspective: SystemsPerspectiveStructured = {
  perspectiveFormat: "clarity_v2",
  title: "Systems Review",
  suitableFor: "Systems thinking",
  nodeCritiques: [
    { nodeId: "n1", nodeLabel: "Economy", userImpact: "direct", userContextSnippet: "GDP growth",
      critique: "Oversimplified", remediationAlternative: "Consider second-order effects" },
  ],
};

const evaluativeMatrixPerspective: EvaluativeMatrixPerspectiveStructured = {
  perspectiveFormat: "clarity_v2",
  title: "Matrix Review",
  suitableFor: "Evaluative thinking",
  placementCritiques: [
    { optionId: "o1", optionTitle: "Option A", userQuadrant: "high-high",
      userValueContext: "Prioritized cost", aiEvaluationText: "Good placement" },
  ],
};

const evaluativeScoringPerspective: EvaluativeScoringPerspectiveStructured = {
  perspectiveFormat: "clarity_v2",
  title: "Scoring Review",
  suitableFor: "Weighted evaluation",
  critiqueMatrix: [
    { criterionId: "c1", criterionLabel: "Feasibility", userAssignedWeight: 3,
      userValueContext: "Weighted high", aiEvaluationText: "Reasonable weight" },
  ],
};

const generativePerspective: GenerativePerspectiveStructured = {
  perspectiveFormat: "clarity_v2",
  title: "Generative Review",
  suitableFor: "Structured writing",
  stepCritiques: [
    { phaseId: "p1", promptQuestion: "What is the problem?", userResponseSnippet: "User wrote...",
      critique: "Too vague", remediationAlternative: "Be specific" },
  ],
  openQuestions: ["What would happen if...?"],
};

describe("getStructuredPerspectiveSections", () => {
  it("maps legacy perspective to four sections", () => {
    const sections = getStructuredPerspectiveSections(legacyPerspective);
    expect(sections).toHaveLength(4);
    expect(sections.map((s) => s.key)).toEqual(["embedded", "userFound", "additional", "openQuestions"]);
    expect(sections[0].points).toBe(legacyPerspective.embedded);
    expect(sections[1].points).toBe(legacyPerspective.userFound);
  });

  it("uses PERSPECTIVE_UI_SECTIONS titles", () => {
    const sections = getStructuredPerspectiveSections(legacyPerspective);
    for (let i = 0; i < PERSPECTIVE_UI_SECTIONS.length; i++) {
      expect(sections[i].title).toBe(PERSPECTIVE_UI_SECTIONS[i].title);
    }
  });
});

describe("getClarityPerspectiveViewModel", () => {
  it("builds analytical view model with highlight critiques", () => {
    const vm = getClarityPerspectiveViewModel(analyticalPerspective, "analytical");
    expect(vm.format).toBe("clarity_v2");
    expect(vm.suitableFor).toBe("Critical analysis practice");
    expect(vm.blocks).toHaveLength(2);
    expect(vm.blocks[0].id).toBe("hc1");
    expect(vm.blocks[0].userSnippet).toBe("the claim that...");
    expect(vm.blocks[0].body).toBe("Weak evidence");
    expect(vm.blocks[0].remediation).toBe("Cite source");
  });

  it("auto-generates IDs for critiques without id field", () => {
    const vm = getClarityPerspectiveViewModel(analyticalPerspective, "analytical");
    expect(vm.blocks[1].id).toBe("hc_2");
  });

  it("builds systems view model with node critiques", () => {
    const vm = getClarityPerspectiveViewModel(systemsPerspective, "systems");
    expect(vm.blocks).toHaveLength(1);
    expect(vm.blocks[0].id).toBe("n1");
    expect(vm.blocks[0].title).toBe("Economy");
    expect(vm.blocks[0].userSnippet).toBe("GDP growth");
  });

  it("falls back to Impact label when userContextSnippet is empty", () => {
    const noSnippet: SystemsPerspectiveStructured = {
      ...systemsPerspective,
      nodeCritiques: [
        { nodeId: "n1", nodeLabel: "X", userImpact: "indirect", userContextSnippet: "",
          critique: "C", remediationAlternative: "R" },
      ],
    };
    const vm = getClarityPerspectiveViewModel(noSnippet, "systems");
    expect(vm.blocks[0].userSnippet).toBe("Impact: indirect");
  });

  it("builds evaluative-matrix view model", () => {
    const vm = getClarityPerspectiveViewModel(evaluativeMatrixPerspective, "evaluative-matrix");
    expect(vm.blocks).toHaveLength(1);
    expect(vm.blocks[0].title).toBe("Option A");
    expect(vm.blocks[0].remediation).toBeNull();
  });

  it("builds evaluative-scoring view model", () => {
    const vm = getClarityPerspectiveViewModel(evaluativeScoringPerspective, "evaluative-scoring");
    expect(vm.blocks).toHaveLength(1);
    expect(vm.blocks[0].id).toBe("c1");
    expect(vm.blocks[0].title).toBe("Feasibility");
  });

  it("builds generative view model with step critiques", () => {
    const vm = getClarityPerspectiveViewModel(generativePerspective, "generative");
    expect(vm.blocks).toHaveLength(1);
    expect(vm.blocks[0].title).toBe("What is the problem?");
    expect(vm.blocks[0].remediation).toBe("Be specific");
  });

  it("includes open questions in disagreePoints", () => {
    const vm = getClarityPerspectiveViewModel(analyticalPerspective, "analytical");
    const openQ = vm.disagreePoints.filter((p) => p.section === "openQuestionsList");
    expect(openQ).toHaveLength(1);
    expect(openQ[0].pointBody).toBe("How does this apply?");
    expect(openQ[0].pointId).toBe("open_1");
  });

  it("builds disagreePoints from blocks", () => {
    const vm = getClarityPerspectiveViewModel(analyticalPerspective, "analytical");
    const critiques = vm.disagreePoints.filter((p) => p.section === "highlightCritiques");
    expect(critiques).toHaveLength(2);
    expect(critiques[0].pointBody).toContain("Weak evidence");
    expect(critiques[0].pointBody).toContain("Cite source");
  });

  it("returns empty blocks when no critiques match kind", () => {
    const vm = getClarityPerspectiveViewModel(analyticalPerspective, "systems");
    expect(vm.blocks).toHaveLength(0);
  });
});

describe("getPerspectiveViewModel", () => {
  it("returns clarity_v2 format for clarity perspective", () => {
    const vm = getPerspectiveViewModel(analyticalPerspective, "analytical");
    expect(vm.format).toBe("clarity_v2");
  });

  it("returns legacy format for legacy perspective", () => {
    const vm = getPerspectiveViewModel(legacyPerspective, "analytical");
    expect(vm.format).toBe("legacy");
    if (vm.format === "legacy") {
      expect(vm.sections).toHaveLength(4);
    }
  });
});

describe("structuredPerspectiveToMarkdown", () => {
  it("converts clarity perspective to markdown", () => {
    const md = structuredPerspectiveToMarkdown(analyticalPerspective, "analytical");
    expect(md).toContain("### Critical analysis practice");
    expect(md).toContain("**You wrote/selected:** the claim that...");
    expect(md).toContain("Weak evidence");
    expect(md).toContain("**Stronger alternative:** Cite source");
    expect(md).toContain("How does this apply?");
  });

  it("converts legacy perspective to markdown", () => {
    const md = structuredPerspectiveToMarkdown(legacyPerspective, "analytical");
    expect(md).toContain("## What I intentionally embedded");
    expect(md).toContain("**Bias** - Confirmation bias present");
    expect(md).toContain("## Things you found that I didn't plan");
    expect(md).toContain("- Found a fallacy");
    expect(md).toContain("## Open questions");
  });

  it("omits remediation when null", () => {
    const md = structuredPerspectiveToMarkdown(evaluativeMatrixPerspective, "evaluative-matrix");
    expect(md).not.toContain("Stronger alternative");
  });

  it("includes title in block when present", () => {
    const md = structuredPerspectiveToMarkdown(systemsPerspective, "systems");
    expect(md).toContain("**Economy**");
  });
});
