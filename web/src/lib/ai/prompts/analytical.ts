import { CUSTOM_DOMAIN_PLACEHOLDER, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

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
  const domainHint =
    input.domain.trim() && input.domain.trim() !== CUSTOM_DOMAIN_PLACEHOLDER
      ? `\nTone/register hint: ${input.domain.trim()}`
      : "";

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

Return a single JSON object with this exact shape:
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
}

embeddedIssues must have exactly 4 items (1 obvious, 2 moderate, 1 subtle severities).
validPoints must have exactly 2 items (the decoys).${adapt ? `\n\n${adapt}` : ""}`;
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

Return a single JSON object with this exact shape:
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
}

embeddedIssues must have exactly 4 items (1 obvious, 2 moderate, 1 subtle severities).
validPoints must have exactly 2 items (the decoys).${adapt ? `\n\n${adapt}` : ""}`;
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
  const domainHint =
    input.domain.trim() && input.domain.trim() !== CUSTOM_DOMAIN_PLACEHOLDER
      ? `\nTone/register hint: ${input.domain.trim()}`
      : "";

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

Return a single JSON object with this exact shape:
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
}

embeddedIssues must be an EMPTY array (there are no real issues).
validPoints must have 2-3 items (statements that look suspicious but are valid).${adapt ? `\n\n${adapt}` : ""}`;
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

Return a single JSON object with this exact shape:
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
}

embeddedIssues must be an EMPTY array (there are no real issues).
validPoints must have 2-3 items (statements that look suspicious but are valid).${adapt ? `\n\n${adapt}` : ""}`;
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

Return a single JSON object with this exact shape:
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
}

Requirements:
- Use the USER TEXT above directly as the passage. You may lightly trim whitespace but must NOT paraphrase or expand it.
- embeddedIssues must have exactly 4 items (1 obvious, 2 moderate, 1 subtle severities).
- validPoints must have exactly 2 items (decoy statements that look suspicious but are actually valid).${adapt ? `\n\n${adapt}` : ""}`;
}
