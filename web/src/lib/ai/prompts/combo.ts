import type { ComboPresetId } from "@/lib/types/exercise";
import { CUSTOM_DOMAIN_PLACEHOLDER, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

const JSON_RULES = `Return ONLY one JSON object (no markdown fences) with the exact keys requested for this preset.
Use the SAME sharedScenario string for every sub-exercise that has a scenario or passage field.
Analytical exercises must include embeddedIssues and validPoints as in standalone analytical JSON.
Systems exercises must use exactly six nodes with ids node_1 … node_6, intendedConnections, shockEvent.
Evaluative matrix must use variant "matrix", axisX, axisY, 4–6 options with intendedQuadrant.
Generative must include title, scenario, exactly 4 prompts with unique ids (independent-style: no draftText, no hints).
Sequential must include title, scenario, steps (6–10), criticalErrors.`;

export function buildComboGenerationPrompt(input: {
  preset: ComboPresetId;
  domain: string;
  userContext?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() ? `User context:\n${input.userContext.trim()}\n\n` : "";
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint =
    input.domain.trim() && input.domain.trim() !== CUSTOM_DOMAIN_PLACEHOLDER
      ? `Tone/register hint: ${input.domain.trim()}\n\n`
      : "";

  const intro = scenarioBlock
    ? `${ctx}${scenarioBlock}\n\n${domainHint}You are designing a linked exercise bundle anchored to the user's scenario above (reuse the same stakes across sub-exercises).`
    : `${ctx}You are designing a linked exercise bundle for domain: ${input.domain}.`;

  if (input.preset === "full_analysis") {
    return `${intro}

Preset: full_analysis - same scenario, three mechanics in order:
1) Analytical (passage = sharedScenario, embedded issues to highlight)
2) Systems (dependency graph + shock on that situation)
3) Evaluative matrix (trade-offs in that situation)

${JSON_RULES}

Required top-level keys:
- preset: "full_analysis"
- sharedTitle: short title for the bundle
- sharedScenario: one coherent scenario paragraph (this text is reused)
- analytical: { title, passage (must equal sharedScenario), embeddedIssues[], validPoints[] }
- systems: { title, scenario (must equal sharedScenario), nodes, intendedConnections, shockEvent }
- evaluativeMatrix: { variant: "matrix", title, scenario (must equal sharedScenario), axisX, axisY, options }`;
  }
  if (input.preset === "decision_sprint") {
    const presetIntro = scenarioBlock
      ? `${intro}\n\nPreset: decision_sprint`
      : `${ctx}Domain: ${input.domain}. Preset: decision_sprint`;
    return `${presetIntro} - evaluative matrix then generative writing on the SAME scenario.

${JSON_RULES}

Required keys:
- preset: "decision_sprint"
- sharedTitle, sharedScenario
- evaluativeMatrix: matrix variant as above
- generative: { title, scenario (sharedScenario), prompts[4] }`;
  }
  const presetIntro = scenarioBlock
    ? `${intro}\n\nPreset: root_cause`
    : `${ctx}Domain: ${input.domain}. Preset: root_cause`;
  return `${presetIntro} - sequential ordering, then systems map, then analytical deep read on the SAME scenario.

${JSON_RULES}

Required keys:
- preset: "root_cause"
- sharedTitle, sharedScenario
- sequential: { title, scenario (sharedScenario), steps, criticalErrors }
- systems: { title, scenario (sharedScenario), nodes, intendedConnections, shockEvent }
- analytical: { title, passage (sharedScenario), embeddedIssues, validPoints }`;
}
