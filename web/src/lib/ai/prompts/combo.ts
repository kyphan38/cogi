import type { ComboPresetId } from "@/lib/types/exercise";
import { CUSTOM_DOMAIN_PLACEHOLDER, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";
import { isGeopoliticsAnalyticalDomain } from "@/lib/exercise/geopolitics-domains";
import type { GenerativeVariant } from "@/lib/ai/validators/generative";

const SHARED_SCENARIO_RULE =
  "Return ONLY one JSON object (no markdown fences) with the exact keys requested for this preset.\nUse the SAME sharedScenario string for every sub-exercise that has a scenario or passage field.";

function analyticalRequirementLine(isGeo: boolean): string {
  return isGeo
    ? `Analytical exercises must include embeddedIssues (exactly 4 items: 1 framing_bias, 1 missing_actor, 1 assumed_causation, 1 analogy_misuse) and validPoints (exactly 2 items), PLUS hiddenPerspective (whose viewpoint the passage is secretly written from) and missingActors (1-2 stakeholders whose interests are absent). Do not reveal the hidden perspective anywhere in the passage text.`
    : `Analytical exercises must include embeddedIssues and validPoints as in standalone analytical JSON.`;
}

function systemsRequirementLine(isGeo: boolean): string {
  return isGeo
    ? `Systems exercises must use exactly six nodes with ids node_1…node_6 representing key actors/institutions/forces, intendedConnections (Perspective A's view of the relationships, at least one feedback loop), shockEvent (a shared what-if ripple from Perspective A's view), PLUS perspectiveAName, perspectiveBName (two different named actors), intendedConnectionsB (Perspective B's view of the SAME nodes, at least one feedback loop), and shockEventB (the SAME shock event, only directlyAffected/indirectlyAffected/explanation from Perspective B's view - do not repeat the shock description).`
    : `Systems exercises must use exactly six nodes with ids node_1…node_6, intendedConnections, shockEvent.`;
}

function sequentialRequirementLine(isGeo: boolean): string {
  return isGeo
    ? `Sequential must include title, scenario, perspectiveAName, perspectiveBName (two different named actors), and 6-10 steps that are actor-neutral in wording, each with correctPosition (Actor A's ideal order index) AND correctPositionB (Actor B's ideal order index for the SAME step - must genuinely differ from Actor A's in at least half the steps), plus criticalErrors (Actor A's ordering mistakes) and criticalErrorsB (Actor B's ordering mistakes, a distinct non-empty list).`
    : `Sequential must include title, scenario, steps (6–10), criticalErrors.`;
}

function generativeRequirementLine(variant: GenerativeVariant): string {
  if (variant === "reframing") {
    return `Generative must include title, scenario (stating the problem the "obvious"/naive way, with one unexamined assumption baked in), and exactly 4 prompts with unique ids that are genuinely distinct reframing techniques (How-Might-We restatement, underlying-need reframe, stakeholder-flip reframe, constraint-removal reframe) - no draftText, no hints.`;
  }
  if (variant === "inversion") {
    return `Generative must include title, scenario (stating a concrete goal/initiative already in motion, not a problem to solve), and exactly 4 prompts with unique ids: three causally-distinct catastrophic failure paths, then a fourth prompt synthesizing ONE preventive action targeting the most dangerous path - no draftText, no hints.`;
  }
  return `Generative must include title, scenario, exactly 4 prompts with unique ids covering: core problem, alternatives, strongest counterargument to the preferred path, and failure/fallback plan - no draftText, no hints.`;
}

export function buildComboGenerationPrompt(input: {
  preset: ComboPresetId;
  domain: string;
  userContext?: string;
  customScenario?: string;
  /** Only used by decision_sprint - which standalone generative task type to request (§2a: resolves
   * the old undocumented "independent-style" 4th shape by giving decision_sprint the same three
   * real variants standalone Generative mode offers, defaulting to argue_debate). */
  generativeVariant?: GenerativeVariant;
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

  const buildPresetIntro = (presetName: string): string =>
    scenarioBlock ? `${intro}\n\nPreset: ${presetName}` : `${ctx}Domain: ${input.domain}. Preset: ${presetName}`;

  if (input.preset === "full_analysis") {
    const isGeo = isGeopoliticsAnalyticalDomain(input.domain);
    return `${intro}

Preset: full_analysis - same scenario, three mechanics in order:
1) Analytical (passage = sharedScenario, embedded issues to highlight)
2) Systems (dependency graph + shock on that situation)
3) Evaluative matrix (trade-offs in that situation)

${SHARED_SCENARIO_RULE}
${analyticalRequirementLine(isGeo)}
${systemsRequirementLine(isGeo)}
Evaluative matrix must use variant "matrix", axisX, axisY, 4–6 options with intendedQuadrant.

Required top-level keys:
- preset: "full_analysis"
- sharedTitle: short title for the bundle
- sharedScenario: one coherent scenario paragraph (this text is reused)
- analytical: { title, passage (must equal sharedScenario), embeddedIssues[], validPoints[]${isGeo ? ", hiddenPerspective, missingActors[]" : ""} }
- systems: { title, scenario (must equal sharedScenario), nodes, intendedConnections, shockEvent${isGeo ? ", perspectiveAName, perspectiveBName, intendedConnectionsB, shockEventB" : ""} }
- evaluativeMatrix: { variant: "matrix", title, scenario (must equal sharedScenario), axisX, axisY, options }`;
  }
  if (input.preset === "decision_sprint") {
    const presetIntro = buildPresetIntro("decision_sprint");
    const variant = input.generativeVariant ?? "argue_debate";
    return `${presetIntro} - evaluative matrix then generative writing on the SAME scenario.

${SHARED_SCENARIO_RULE}
Evaluative matrix must use variant "matrix", axisX, axisY, 4–6 options with intendedQuadrant.
${generativeRequirementLine(variant)}

Required keys:
- preset: "decision_sprint"
- sharedTitle, sharedScenario
- evaluativeMatrix: matrix variant as above
- generative: { title, scenario (sharedScenario), prompts[4] }`;
  }
  if (input.preset === "root_cause") {
    const isGeo = isGeopoliticsAnalyticalDomain(input.domain);
    const presetIntro = buildPresetIntro("root_cause");
    return `${presetIntro} - sequential ordering, then systems map, then analytical deep read on the SAME scenario.

${SHARED_SCENARIO_RULE}
${sequentialRequirementLine(isGeo)}
${systemsRequirementLine(isGeo)}
${analyticalRequirementLine(isGeo)}

Required keys:
- preset: "root_cause"
- sharedTitle, sharedScenario
- sequential: { title, scenario (sharedScenario), steps, criticalErrors${isGeo ? ", perspectiveAName, perspectiveBName, criticalErrorsB" : ""} }
- systems: { title, scenario (sharedScenario), nodes, intendedConnections, shockEvent${isGeo ? ", perspectiveAName, perspectiveBName, intendedConnectionsB, shockEventB" : ""} }
- analytical: { title, passage (sharedScenario), embeddedIssues, validPoints${isGeo ? ", hiddenPerspective, missingActors[]" : ""} }
Analytical stays the highlight_tag task here (issue-spotting fits "root cause" better than steelman).`;
  }

  // crisis_response: capstone preset chaining the geopolitics variants from Phase 4/5 with the
  // uncertainty evaluative variant from Phase 3, all on one shared dual-actor crisis.
  const presetIntro = buildPresetIntro("crisis_response");
  return `${presetIntro} - a geopolitical crisis, examined three ways for the SAME two actors:
1) Sequential (order response steps, Actor A's priorities vs Actor B's)
2) Systems (map how the crisis ripples through the same actor network, both perspectives)
3) Evaluative uncertainty (estimate probabilities and payoffs for the response options)

${SHARED_SCENARIO_RULE}
Pick TWO named actors (states, coalitions, institutions) for this crisis. Use the EXACT SAME two
names as perspectiveAName/perspectiveBName at the top level AND inside both "sequential" and
"systems" (all three copies must be identical strings).
${sequentialRequirementLine(true)}
${systemsRequirementLine(true)}
Evaluative must always use variant "uncertainty": title, scenario (sharedScenario), 2-5 options each
with 2-5 outcomes (unique ids, probabilities summing to 1.0, signed payoff in one consistent unit,
explanation). Vary risk profile across options (at least one safe, at least one risky). This stage is
about the crisis response OPTIONS available to the decision-maker(s), not scored per-actor.

Required top-level keys:
- preset: "crisis_response"
- sharedTitle, sharedScenario
- perspectiveAName, perspectiveBName: the two actor names (repeated identically below)
- sequential: { title, scenario (sharedScenario), perspectiveAName, perspectiveBName, steps, criticalErrors, criticalErrorsB }
- systems: { title, scenario (sharedScenario), nodes, intendedConnections, shockEvent, perspectiveAName, perspectiveBName, intendedConnectionsB, shockEventB }
- evaluativeUncertainty: { variant: "uncertainty", title, scenario (sharedScenario), options[] }`;
}
