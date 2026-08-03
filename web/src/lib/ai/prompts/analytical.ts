import { buildDomainHint, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

const ANALYTICAL_ISSUE_SHAPE_BLOCK = `Return a single JSON object with this exact shape:
{
  "title": string,
  "passage": string,
  "embeddedIssues": [
    {
      "description": string,
      "type": "logical_fallacy" | "hidden_assumption" | "weak_evidence" | "bias",
      "severity": "obvious" | "moderate" | "subtle",
      "textSegment": string (exact substring from passage),
      "explanation": string
    }
  ],
  "validPoints": [
    {
      "textSegment": string (exact substring that looks suspicious but is valid),
      "explanation": string
    }
  ]
}`;

const ANALYTICAL_ISSUE_COUNT_FOOTER = `embeddedIssues must have exactly 4 items (1 obvious, 2 moderate, 1 subtle severities).
validPoints must have exactly 2 items (the decoys).`;

const SOUND_REASONING_SHAPE_BLOCK = `Return a single JSON object with this exact shape:
{
  "title": string,
  "passage": string,
  "embeddedIssues": [],
  "validPoints": [
    {
      "textSegment": string (exact substring that looks suspicious but is actually valid),
      "explanation": string (why it's actually sound reasoning)
    }
  ],
  "isSoundReasoning": true
}`;

const SOUND_REASONING_COUNT_FOOTER = `embeddedIssues must be an EMPTY array (there are no real issues).
validPoints must have 2-3 items (statements that look suspicious but are valid).`;

const GEOPOLITICS_ISSUE_SHAPE_PREFIX = `Return a single JSON object with this exact shape:
{
  "title": string,
  "passage": string,
  "embeddedIssues": [
    {
      "description": string,
      "type": "framing_bias" | "missing_actor" | "assumed_causation" | "analogy_misuse",
      "severity": "obvious" | "moderate" | "subtle",
      "textSegment": string (exact substring from passage),
      "explanation": string
    }
  ],
  "validPoints": [
    {
      "textSegment": string,
      "explanation": string
    }
  ],`;

export function buildAnalyticalGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  /** Phase 7 - optional soft steering; must not change required JSON shape. */
  adaptationAppendix?: string;
  /** When set, design the passage around this situation instead of a generic domain topic. */
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);

  if (scenarioBlock) {
    return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}
${domainHint}

${scenarioBlock}

Write an analysis passage (250-350 words) clearly grounded in the scenario above. The passage must contain exactly:
- 1 obvious issue (most people would catch this)
- 2 moderate issues (requires careful reading)
- 1 subtle issue (only critical thinkers would catch)
- 2 "decoy" statements that LOOK suspicious but are actually valid (these go in validPoints, not embeddedIssues)

The passage should read naturally as part of that situation (memo, internal brief, stakeholder letter, etc., as fits).
Do NOT make issues cartoonishly obvious.

${ANALYTICAL_ISSUE_SHAPE_BLOCK}

${ANALYTICAL_ISSUE_COUNT_FOOTER}${adapt ? `\n\n${adapt}` : ""}`;
  }

  return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}

Generate a ${input.domain} analysis passage (250-350 words) that contains exactly:
- 1 obvious issue (most people would catch this)
- 2 moderate issues (requires careful reading)
- 1 subtle issue (only critical thinkers would catch)
- 2 "decoy" statements that LOOK suspicious but are actually valid (these go in validPoints, not embeddedIssues)

The passage should read naturally, like a real ${input.domain} analysis or plan.
Do NOT make issues cartoonishly obvious.

${ANALYTICAL_ISSUE_SHAPE_BLOCK}

${ANALYTICAL_ISSUE_COUNT_FOOTER}${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildAnalyticalSoundReasoningPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);

  if (scenarioBlock) {
    return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}
${domainHint}

${scenarioBlock}

Write an analysis passage (250-350 words) grounded in the scenario above where the reasoning is GENUINELY SOUND.

The passage should:
- Make claims that are well-supported by the evidence presented
- Use valid logical structure
- Contain 2-3 statements that LOOK suspicious (could be mistaken for fallacies or assumptions) but are actually valid upon careful analysis
- Read naturally within that situation

The exercise tests whether the user can distinguish good reasoning from bad - the correct answer here is "this reasoning is mostly sound."

${SOUND_REASONING_SHAPE_BLOCK}

${SOUND_REASONING_COUNT_FOOTER}${adapt ? `\n\n${adapt}` : ""}`;
  }

  return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}

Generate a ${input.domain} analysis passage (250-350 words) where the reasoning is GENUINELY SOUND.

The passage should:
- Make claims that are well-supported by the evidence presented
- Use valid logical structure
- Contain 2-3 statements that LOOK suspicious (could be mistaken for fallacies or assumptions) but are actually valid upon careful analysis
- Read naturally, like a real ${input.domain} analysis

The exercise tests whether the user can distinguish good reasoning from bad - the correct answer here is "this reasoning is mostly sound."

${SOUND_REASONING_SHAPE_BLOCK}

${SOUND_REASONING_COUNT_FOOTER}${adapt ? `\n\n${adapt}` : ""}`;
}

const STEELMAN_SHAPE_BLOCK = `Return a single JSON object with this exact shape:
{
  "title": string,
  "passage": string,
  "embeddedIssues": [],
  "validPoints": []
}`;

export function buildAnalyticalSteelmanPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);

  if (scenarioBlock) {
    return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}
${domainHint}

${scenarioBlock}

State a contestable position or recommendation (80-150 words) clearly grounded in the scenario above - a policy call, a technical tradeoff decision, a prioritization choice - something a reasonable person could disagree with.

State it plainly and somewhat one-sidedly, the way a stakeholder would first pitch it. Do NOT pre-empt counterarguments, hedge heavily, or already make the strongest possible case for it - the user's task will be to write a stronger, more rigorous argument for this position than you just did.

${STEELMAN_SHAPE_BLOCK}

embeddedIssues and validPoints must both be empty arrays.${adapt ? `\n\n${adapt}` : ""}`;
  }

  return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}

State a contestable ${input.domain} position or recommendation (80-150 words) - a policy call, a technical tradeoff decision, a prioritization choice - something a reasonable person could disagree with.

State it plainly and somewhat one-sidedly, the way a stakeholder would first pitch it. Do NOT pre-empt counterarguments, hedge heavily, or already make the strongest possible case for it - the user's task will be to write a stronger, more rigorous argument for this position than you just did.

${STEELMAN_SHAPE_BLOCK}

embeddedIssues and validPoints must both be empty arrays.${adapt ? `\n\n${adapt}` : ""}`;
}

const GEOPOLITICS_PERSPECTIVE_POOL = [
  "US-aligned think tank",
  "Chinese state-media framing",
  "small-state pragmatist view",
  "European liberal institutionalist view",
  "Global South developmentalist lens",
  "Russian security narrative",
  "ASEAN neutral broker framing",
  "Gulf rentier-state strategic lens",
  "Turkish regional power projection view",
  "Indian Ocean maritime security framing",
] as const;

const TEXT_SEGMENT_RULE = `CRITICAL textSegment rule: Each textSegment MUST be copied verbatim from passage (case-sensitive, character-for-character). Before returning JSON, verify every textSegment appears in passage; if not, fix the segment or passage.`;

export function buildGeopoliticsAnalyticalPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const perspectivePick = `Pick ONE unstated perspective at random from this pool (vary across generations): ${GEOPOLITICS_PERSPECTIVE_POOL.join("; ")}. Do NOT reveal which you chose in the passage.`;

  const topicLine = scenarioBlock
    ? `${scenarioBlock}\n\nWrite a passage (300-400 words) clearly grounded in the scenario above about: ${input.domain}.`
    : `Generate a passage (300-400 words) that reads like a real geopolitical analysis or policy brief about: ${input.domain}.`;

  return `You are generating a geopolitical analysis exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}
${domainHint}

${perspectivePick}

${topicLine}

The passage must be written from the chosen SPECIFIC but unstated perspective. Do NOT reveal the perspective explicitly - the user must identify it.

Embed exactly:
- 1 framing bias (the analysis takes one actor's interests as the default "reasonable" position)
- 1 missing actor or missing perspective (a relevant stakeholder whose interests are never mentioned)
- 1 assumed causation (correlation or sequence presented as causal without evidence)
- 1 historical analogy that partially fits but breaks down on closer examination

Also include:
- 2 "decoy" statements that LOOK biased but are actually well-supported claims

${TEXT_SEGMENT_RULE}

${GEOPOLITICS_ISSUE_SHAPE_PREFIX}
  "hiddenPerspective": string (whose viewpoint is this written from - revealed after user attempts),
  "missingActors": [string] (1-2 actors/stakeholders whose interests are absent from the passage)
}

embeddedIssues must have exactly 4 items (1 of each type listed above).
validPoints must have exactly 2 items.
Set one issue severity to obvious, two to moderate, one to subtle.${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildAnalyticalFromUserTextPrompt(input: {
  domain: string;
  userContext?: string;
  userText: string;
  adaptationAppendix?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  return `You are analyzing the user's own real-world text. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}

DOMAIN: ${input.domain}

USER TEXT (already sanitized, do NOT rewrite it, only analyze it):
"""
${input.userText}
"""

Your task:
- Treat the provided text as the passage.
- Identify embedded issues and decoy valid points exactly as in the analytical exercise spec.

${ANALYTICAL_ISSUE_SHAPE_BLOCK}

Requirements:
- Use the USER TEXT above directly as the passage. You may lightly trim whitespace but must NOT paraphrase or expand it.
- embeddedIssues must have exactly 4 items (1 obvious, 2 moderate, 1 subtle severities).
- validPoints must have exactly 2 items (decoy statements that look suspicious but are actually valid).${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildGeopoliticsFromUserTextPrompt(input: {
  domain: string;
  userContext?: string;
  userText: string;
  adaptationAppendix?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  return `You are analyzing the user's own real-world geopolitical text. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}

DOMAIN: ${input.domain}

USER TEXT (already sanitized, do NOT rewrite it, only analyze it):
"""
${input.userText}
"""

Analyze this pasted article explicitly for geopolitical analytical issues:
- framing_bias (one actor's interests treated as the default reasonable position)
- missing_actor (relevant stakeholder or perspective absent from the text)
- assumed_causation (correlation or sequence presented as causal without evidence)
- analogy_misuse (historical comparison that partially fits but breaks down)

Do NOT label issues as generic logical_fallacy, hidden_assumption, weak_evidence, or bias.

${TEXT_SEGMENT_RULE}

${GEOPOLITICS_ISSUE_SHAPE_PREFIX}
  "hiddenPerspective": string (whose viewpoint is this written from),
  "missingActors": [string] (1-2 actors/stakeholders whose interests are absent)
}

Requirements:
- Use the USER TEXT above directly as the passage. You may lightly trim whitespace but must NOT paraphrase or expand it.
- embeddedIssues: exactly 4 items (one of each geo type above).
- validPoints: exactly 2 decoy statements that look biased but are well-supported.
- Set one issue severity to obvious, two to moderate, one to subtle.${adapt ? `\n\n${adapt}` : ""}`;
}
