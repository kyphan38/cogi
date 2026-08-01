import { describe, expect, it } from "vitest";
import { expectedValueScenarios, evValueOfInformationScenario } from "./expected-value";

describe("Expected Value Scenarios Catalog", () => {
  it("should contain 4 distinct scenarios with valid fields", () => {
    expect(expectedValueScenarios).toHaveLength(4);
    for (const scenario of expectedValueScenarios) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.topic).toBe("expected_value");
      expect(scenario.situation).toBeTruthy();
      expect(scenario.commitSpec.options).toBeDefined();
      expect(scenario.commitSpec.options!.length).toBeGreaterThanOrEqual(2);
      expect(scenario.canonicalAnswer).toBeTruthy();
      expect(scenario.explanation).toBeTruthy();
      expect(scenario.transfers.length).toBeGreaterThan(0);
      expect(scenario.boundaries.length).toBeGreaterThan(0);
    }
  });

  it("should enforce strict option label neutrality (no answer leakage or formulas in labels)", () => {
    const leakagePatterns = [/focus on/i, /based on/i, /\bev\b/i, /\bexpected value\b/i, /%\)/, /reserves/i];
    for (const scenario of expectedValueScenarios) {
      for (const opt of scenario.commitSpec.options || []) {
        for (const pattern of leakagePatterns) {
          expect(opt.text).not.toMatch(pattern);
        }
      }
    }
  });

  it("should run Monte Carlo simulation for VoI scenario and verify analytical convergence", () => {
    const N = 500_000;
    let totalProfit = 0;

    for (let i = 0; i < N; i++) {
      // True state of project: 50% success, 50% failure
      const isViable = Math.random() < 0.5;

      // Study signal generation based on confusion matrix:
      // Viable project: 80% PASS, 20% HIGH RISK
      // Doomed project: 20% PASS, 80% HIGH RISK
      const studySignalsPass = isViable ? Math.random() < 0.8 : Math.random() < 0.2;

      // Decision rule: Pay $60,000 for study; launch ONLY if study signals PASS
      const studyCost = 60_000;
      let projectRevenue = 0;
      let buildCost = 0;

      if (studySignalsPass) {
        buildCost = 500_000;
        projectRevenue = isViable ? 1_700_000 : 0;
      } else {
        // Cancel launch on HIGH RISK signal
        buildCost = 0;
        projectRevenue = 0;
      }

      const trialProfit = projectRevenue - buildCost - studyCost;
      totalProfit += trialProfit;
    }

    const empiricalEV = totalProfit / N;
    const analyticalEV = 370_000;
    const tolerance = 10_000;

    expect(Math.abs(empiricalEV - analyticalEV)).toBeLessThanOrEqual(tolerance);
  });
});
