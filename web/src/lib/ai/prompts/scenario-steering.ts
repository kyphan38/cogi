/** Placeholder stored when the user leaves Domain blank in custom-scenario mode. */
export const CUSTOM_DOMAIN_PLACEHOLDER = "(custom)";

/** Max length for pasted scenario text (must match API). */
export const CUSTOM_SCENARIO_MAX_LEN = 3000;

/**
 * Validates domain vs custom scenario for exercise setup (non–real_data analytical flows share this).
 */
export function resolveDomainAndScenario(input: {
  mode: "generated" | "custom_scenario";
  domain: string;
  customScenario: string;
}):
  | { ok: true; effectiveDomain: string; customScenarioOut?: string }
  | { ok: false; error: string } {
  const d = input.domain.trim();
  const s = input.customScenario.trim();
  if (input.mode === "custom_scenario") {
    if (!s) return { ok: false, error: "Describe your scenario." };
    if (s.length > CUSTOM_SCENARIO_MAX_LEN) {
      return {
        ok: false,
        error: `Scenario is too long (max ${CUSTOM_SCENARIO_MAX_LEN} characters).`,
      };
    }
    return {
      ok: true,
      effectiveDomain: d || CUSTOM_DOMAIN_PLACEHOLDER,
      customScenarioOut: s,
    };
  }
  if (!d) return { ok: false, error: "Enter a domain." };
  return { ok: true, effectiveDomain: d };
}

/**
 * Block injected when the user provides their own situation instead of a broad domain.
 */
export function formatUserScenarioBlock(customScenario?: string): string | undefined {
  const t = customScenario?.trim();
  if (!t) return undefined;
  return `The user has provided a specific real-world scenario. Anchor the entire exercise to it—preserve actors, stakes, and constraints.

USER SCENARIO:
"""
${t}
"""`;
}
