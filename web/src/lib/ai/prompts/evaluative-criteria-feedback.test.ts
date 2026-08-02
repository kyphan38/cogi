import { describe, expect, it } from "vitest";
import { buildEvaluativeCriteriaFeedbackPrompt } from "./evaluative-criteria-feedback";

const base = {
  title: "Career pivot into AI",
  domain: "career",
  scenario: "You are deciding how to transition into an AI role.",
  userProposedCriteria: [
    { name: "Speed to market", rationale: "I want to work quickly." },
    { name: "Cost", rationale: "I have a limited budget." },
  ],
};

describe("buildEvaluativeCriteriaFeedbackPrompt", () => {
  it("includes title, domain, and scenario", () => {
    const prompt = buildEvaluativeCriteriaFeedbackPrompt({
      ...base,
      aiFramework: { kind: "criteria", criteria: [] },
    });
    expect(prompt).toContain(base.title);
    expect(prompt).toContain(base.domain);
    expect(prompt).toContain(base.scenario);
  });

  it("quotes each user criterion name and rationale", () => {
    const prompt = buildEvaluativeCriteriaFeedbackPrompt({
      ...base,
      aiFramework: { kind: "criteria", criteria: [] },
    });
    expect(prompt).toContain('"Speed to market"');
    expect(prompt).toContain("I want to work quickly.");
    expect(prompt).toContain('"Cost"');
    expect(prompt).toContain("I have a limited budget.");
  });

  it("includes criteria framework labels for the scoring variant", () => {
    const prompt = buildEvaluativeCriteriaFeedbackPrompt({
      ...base,
      aiFramework: {
        kind: "criteria",
        criteria: [
          { id: "c1", label: "Risk", description: "How risky is it", suggestedWeight: 3 },
        ],
      },
    });
    expect(prompt).toContain('"Risk": How risky is it');
  });

  it("includes axis labels for the matrix variant", () => {
    const prompt = buildEvaluativeCriteriaFeedbackPrompt({
      ...base,
      aiFramework: {
        kind: "axes",
        axisX: { label: "Impact", lowLabel: "Low", highLabel: "High" },
        axisY: { label: "Effort", lowLabel: "Low", highLabel: "High" },
      },
    });
    expect(prompt).toContain("Impact");
    expect(prompt).toContain("Effort");
  });

  it("prohibits numeric grading and shortcut id references", () => {
    const prompt = buildEvaluativeCriteriaFeedbackPrompt({
      ...base,
      aiFramework: { kind: "criteria", criteria: [] },
    });
    expect(prompt).toContain("Does not give a numeric grade");
    expect(prompt).toContain("PROHIBITION");
  });
});
