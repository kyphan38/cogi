import { describe, expect, it } from "vitest";
import {
  CUSTOM_DOMAIN_PLACEHOLDER,
  CUSTOM_SCENARIO_MAX_LEN,
  resolveDomainAndScenario,
  formatUserScenarioBlock,
} from "./scenario-steering";

describe("resolveDomainAndScenario", () => {
  describe("generated mode", () => {
    it("succeeds with domain", () => {
      const r = resolveDomainAndScenario({ mode: "generated", domain: "economics", customScenario: "" });
      expect(r).toEqual({ ok: true, effectiveDomain: "economics" });
    });

    it("fails when domain is empty", () => {
      const r = resolveDomainAndScenario({ mode: "generated", domain: "  ", customScenario: "" });
      expect(r).toEqual({ ok: false, error: "Enter a domain." });
    });

    it("trims domain whitespace", () => {
      const r = resolveDomainAndScenario({ mode: "generated", domain: "  tech  ", customScenario: "" });
      expect(r).toEqual({ ok: true, effectiveDomain: "tech" });
    });

    it("ignores customScenario in generated mode", () => {
      const r = resolveDomainAndScenario({ mode: "generated", domain: "health", customScenario: "some scenario" });
      expect(r).toEqual({ ok: true, effectiveDomain: "health" });
      expect("customScenarioOut" in r).toBe(false);
    });
  });

  describe("custom_scenario mode", () => {
    it("succeeds with scenario and domain", () => {
      const r = resolveDomainAndScenario({ mode: "custom_scenario", domain: "finance", customScenario: "My company..." });
      expect(r).toEqual({ ok: true, effectiveDomain: "finance", customScenarioOut: "My company..." });
    });

    it("uses placeholder domain when domain is empty", () => {
      const r = resolveDomainAndScenario({ mode: "custom_scenario", domain: "", customScenario: "scenario text" });
      expect(r).toEqual({ ok: true, effectiveDomain: CUSTOM_DOMAIN_PLACEHOLDER, customScenarioOut: "scenario text" });
    });

    it("fails when scenario is empty", () => {
      const r = resolveDomainAndScenario({ mode: "custom_scenario", domain: "tech", customScenario: "  " });
      expect(r).toEqual({ ok: false, error: "Describe your scenario." });
    });

    it("fails when scenario exceeds max length", () => {
      const long = "x".repeat(CUSTOM_SCENARIO_MAX_LEN + 1);
      const r = resolveDomainAndScenario({ mode: "custom_scenario", domain: "tech", customScenario: long });
      expect(r).toEqual({ ok: false, error: `Scenario is too long (max ${CUSTOM_SCENARIO_MAX_LEN} characters).` });
    });

    it("accepts scenario at exactly max length", () => {
      const exact = "x".repeat(CUSTOM_SCENARIO_MAX_LEN);
      const r = resolveDomainAndScenario({ mode: "custom_scenario", domain: "tech", customScenario: exact });
      expect(r).toHaveProperty("ok", true);
    });
  });
});

describe("formatUserScenarioBlock", () => {
  it("returns undefined for empty/whitespace input", () => {
    expect(formatUserScenarioBlock(undefined)).toBeUndefined();
    expect(formatUserScenarioBlock("")).toBeUndefined();
    expect(formatUserScenarioBlock("   ")).toBeUndefined();
  });

  it("wraps scenario in formatted block", () => {
    const result = formatUserScenarioBlock("My real scenario");
    expect(result).toContain("The user has provided a specific real-world scenario");
    expect(result).toContain("My real scenario");
    expect(result).toContain('"""');
  });

  it("trims whitespace from scenario", () => {
    const result = formatUserScenarioBlock("  padded  ");
    expect(result).toContain("padded");
  });
});
