import { buildDomainHint, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";
import { GEO_FACT_RULE } from "@/lib/ai/prompts/geo-rules";
import { SIGNAL_WORDS } from "@/lib/text/signal-words";
import { GEO_LENSES, GEO_LENS_INFO, type GeoAnalyticalLevelConfig } from "@/lib/exercise/analytical-levels";

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

const PARAGRAPH_RULE = `Split the passage into 2-4 short paragraphs separated by a blank line ("\\n\\n"), so it is easy to read.
Put each embedded issue and each validPoint in its own sentence: no sentence may hold two of them (the reader tags whole sentences).`;

/**
 * Guided level: a main-claim check before hunting for problems. Appended after the
 * shape block, so it adds one top-level key.
 */
export const MAIN_CLAIM_QUIZ_BLOCK = `Also add a top-level "mainClaimQuiz" object, used to check the reader understood the passage before looking for problems:
"mainClaimQuiz": {
  "options": [string, string, string] (exactly 3 short statements, at most 20 words each),
  "answerIndex": number (0, 1 or 2 - the index of the passage's main claim; vary its position),
  "explanation": string (1-2 simple sentences on why that is the main claim)
}
One option is the passage's main claim. The other two are plausible but wrong: a supporting detail, or a claim the passage does not make.`;

/** Problems must come from the reasoning, not from extreme wording (see signal-words.ts). */
const SIGNAL_WORD_RULE = `Do not let single words give the answer away. Signal words: ${SIGNAL_WORDS.join(", ")}.
- At most 1 embeddedIssue textSegment may contain a signal word. The subtle issue contains none.
- At least 1 validPoint textSegment contains a signal word and is still sound (for example "Every loan has a cost: the interest." or "This was the only bank that replied.").
- Build each problem from the reasoning itself: what the claim quietly assumes, what the evidence can really show, a step that does not follow. Not from extreme wording.
- Set severity honestly. obvious: most readers see it on a first read. moderate: you see it when you look again at the evidence or the step. subtle: it sounds reasonable, and you only see it when you ask what it assumes.`;

/** A sound passage should also tempt word hunters: one decoy uses an extreme word and holds up. */
const SOUND_SIGNAL_RULE = `At least 1 validPoint textSegment contains an extreme word (always, never, all, every, only, must) and is still sound, so the reader must check the reasoning, not hunt for words.`;

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
  /** Passage length range, set by the practice level (default "250-350"). */
  passageWords?: string;
  /** Guided level: also ask for the main-claim quiz. */
  withMainClaimQuiz?: boolean;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const words = input.passageWords ?? "250-350";
  const quiz = input.withMainClaimQuiz ? `\n\n${MAIN_CLAIM_QUIZ_BLOCK}` : "";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);

  if (scenarioBlock) {
    return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}
${domainHint}

${scenarioBlock}

Write an analysis passage (${words} words) clearly grounded in the scenario above. The passage must contain exactly:
- 1 obvious issue (most people would catch this)
- 2 moderate issues (requires careful reading)
- 1 subtle issue (only critical thinkers would catch)
- 2 "decoy" statements that LOOK suspicious but are actually valid (these go in validPoints, not embeddedIssues)

The passage should read naturally as part of that situation (memo, internal brief, stakeholder letter, etc., as fits).
Do NOT make issues cartoonishly obvious.
${PARAGRAPH_RULE}
${SIGNAL_WORD_RULE}

${ANALYTICAL_ISSUE_SHAPE_BLOCK}${quiz}

${ANALYTICAL_ISSUE_COUNT_FOOTER}${adapt ? `\n\n${adapt}` : ""}`;
  }

  return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}

Generate a ${input.domain} analysis passage (${words} words) that contains exactly:
- 1 obvious issue (most people would catch this)
- 2 moderate issues (requires careful reading)
- 1 subtle issue (only critical thinkers would catch)
- 2 "decoy" statements that LOOK suspicious but are actually valid (these go in validPoints, not embeddedIssues)

The passage should read naturally, like a real ${input.domain} analysis or plan.
Do NOT make issues cartoonishly obvious.
${PARAGRAPH_RULE}
${SIGNAL_WORD_RULE}

${ANALYTICAL_ISSUE_SHAPE_BLOCK}${quiz}

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
${PARAGRAPH_RULE}
${SOUND_SIGNAL_RULE}

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
${PARAGRAPH_RULE}
${SOUND_SIGNAL_RULE}

${SOUND_REASONING_SHAPE_BLOCK}

${SOUND_REASONING_COUNT_FOOTER}${adapt ? `\n\n${adapt}` : ""}`;
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

const GEO_ISSUE_LINES: Record<string, string> = {
  framing_bias: "1 framing bias (the analysis takes one actor's interests as the default \"reasonable\" position)",
  missing_actor: "1 missing actor or missing perspective (a relevant stakeholder whose interests are never mentioned)",
  assumed_causation: "1 assumed causation (correlation or sequence presented as causal without evidence)",
  analogy_misuse: "1 historical analogy that partially fits but breaks down on closer examination",
};

export function buildGeopoliticsAnalyticalPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
  /** Level config (PLAN-geopolitics.md G1). Without it: the full Expert brief. */
  level?: GeoAnalyticalLevelConfig;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const perspectivePick = `Pick ONE unstated perspective at random from this pool (vary across generations): ${GEOPOLITICS_PERSPECTIVE_POOL.join("; ")}. Do NOT reveal which you chose in the passage.`;
  const lv = input.level;
  const words = lv?.passageWords ?? "300-400";
  const types = lv?.issueTypes ?? ["framing_bias", "missing_actor", "assumed_causation", "analogy_misuse"];
  const decoys = lv?.decoys ?? 2;
  const severities =
    types.length === 2 ? "Set one issue severity to obvious and one to moderate." : "Set one issue severity to obvious, two to moderate, one to subtle.";

  const topicLine = scenarioBlock
    ? `${scenarioBlock}\n\nWrite a passage (${words} words) clearly grounded in the scenario above about: ${input.domain}.`
    : `Generate a passage (${words} words) that reads like a geopolitical analysis or policy brief about: ${input.domain}.`;

  const extras = lv
    ? `,
  "concepts": [ { "term": string, "plain": string (one simple sentence), "example": string (one real-world example everyone agrees on) } ] (exactly 3 ideas that help read THIS passage, e.g. "security dilemma", "chokepoint", "balancing", "sanctions leakage"),
  "conceptChecks": [ { "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string } ] (exactly 1, testing one of the concepts),
  "perspectiveOptions": [string, string, string, string] (exactly 4 viewpoints from the pool above: the hiddenPerspective word for word, plus 3 others that are plausible for this passage; shuffle so the right one is not always first),
  "actorCandidates": [string] (4-6 short actor names: every missingActors entry word for word, plus plausible actors that ARE mentioned or are irrelevant; shuffle),
  "lensQuestions": [
    { "lens": "realist" | "liberal" | "constructivist" | "political_economy", "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string }
  ] (exactly 4, one per lens, about THIS passage. The lens meanings:
${GEO_LENSES.map((l) => `    ${l} = ${GEO_LENS_INFO[l].name}: ${GEO_LENS_INFO[l].question}`).join("\n")}
    The right option is the reading that lens gives; the others are readings from other lenses or common misreadings. Vary which index is right.)`
    : "";

  return `You are generating a geopolitical analysis exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}
${domainHint}

${perspectivePick}

${topicLine}

The passage must be written from the chosen SPECIFIC but unstated perspective. Do NOT reveal the perspective explicitly - the user must identify it.

${GEO_FACT_RULE}

Embed exactly:
${types.map((t) => `- ${GEO_ISSUE_LINES[t]}`).join("\n")}

Also include:
- ${decoys} "decoy" statement${decoys === 1 ? "" : "s"} that LOOK biased but are actually well-supported claims

${TEXT_SEGMENT_RULE}
${PARAGRAPH_RULE}

${GEOPOLITICS_ISSUE_SHAPE_PREFIX}
  "hiddenPerspective": string (whose viewpoint is this written from - revealed after user attempts),
  "missingActors": [string] (1-2 actors/stakeholders whose interests are absent from the passage)${extras}
}

embeddedIssues must have exactly ${types.length} items (1 of each type listed above).
validPoints must have exactly ${decoys} item${decoys === 1 ? "" : "s"}.
${severities}${adapt ? `\n\n${adapt}` : ""}`;
}

/**
 * The user's own text has as many problems as it has: a fixed count would make the
 * model invent problems in sound writing, and the user would learn the wrong lesson.
 */
const USER_TEXT_HONESTY_RULE = `Never invent a problem to reach a number. A statement that admits a limit or uncertainty ("we cannot be sure", "more testing is needed") is good reasoning, not a problem. If the text is sound, say so with fewer or no issues.`;

export function buildAnalyticalFromUserTextPrompt(input: {
  domain: string;
  userContext?: string;
  userText: string;
  adaptationAppendix?: string;
  /** Guided level: also ask for the main-claim quiz. */
  withMainClaimQuiz?: boolean;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const quiz = input.withMainClaimQuiz ? `\n\n${MAIN_CLAIM_QUIZ_BLOCK}` : "";
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
- Find the reasoning problems that are REALLY in it, and the statements that look suspicious but are sound.

${ANALYTICAL_ISSUE_SHAPE_BLOCK}${quiz}

Requirements:
- Use the USER TEXT above directly as the passage. You may lightly trim whitespace but must NOT paraphrase or expand it.
- ${USER_TEXT_HONESTY_RULE}
- embeddedIssues: 0 to 4 items, only real problems. Set each severity honestly (obvious, moderate or subtle); no fixed mix.
- validPoints: 1 to 3 statements that look suspicious but are actually sound (fewer only if the text has none).
- Add a top-level "isSoundReasoning": true when embeddedIssues is empty, otherwise false.

${TEXT_SEGMENT_RULE}${adapt ? `\n\n${adapt}` : ""}`;
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
- ${USER_TEXT_HONESTY_RULE}
- embeddedIssues: 1 to 4 items, at most one of each geo type above, only problems that are really there. Set each severity honestly (obvious, moderate or subtle); no fixed mix.
- validPoints: 1 to 3 statements that look biased but are well-supported (fewer only if the text has none).${adapt ? `\n\n${adapt}` : ""}`;
}
