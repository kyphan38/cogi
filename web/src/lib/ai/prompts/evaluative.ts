import { buildDomainHint, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

export function buildEvaluativeGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const aboutLine = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nYou are generating a structured evaluative-thinking exercise anchored to the user's scenario above.${ctx}`
    : `You are generating a structured evaluative-thinking exercise about: ${input.domain}.${ctx}`;

  return `${aboutLine}

Decide variant:
- MATRIX (variant "matrix") when the decision is naturally framed with exactly TWO evaluation criteria as axes (2x2 quadrants).
- SCORING (variant "scoring") when there are THREE OR MORE criteria / trade-off dimensions (weighted table).

Prefer SCORING for genuinely multi-criteria trade-offs. Use MATRIX only when two axes clearly suffice.

Return ONLY a single JSON object (no markdown fences) matching ONE of:

Matrix shape:
{
  "variant": "matrix",
  "title": "string",
  "scenario": "string",
  "axisX": { "label": "string", "lowLabel": "string", "highLabel": "string" },
  "axisY": { "label": "string", "lowLabel": "string", "highLabel": "string" },
  "options": [
    {
      "id": "unique_id",
      "title": "string",
      "description": "string",
      "intendedQuadrant": "top-left" | "top-right" | "bottom-left" | "bottom-right",
      "explanation": "string"
    }
  ],
  "criteriaCandidates": [ "string", "..." ]
}
Use 4 to 6 options with unique ids.

Scoring shape:
{
  "variant": "scoring",
  "title": "string",
  "scenario": "string",
  "criteria": [
    { "id": "c1", "label": "string", "description": "string", "suggestedWeight": 1 }
  ],
  "options": [
    {
      "id": "o1",
      "title": "string",
      "description": "string",
      "suggestedScores": { "c1": 3 },
      "explanation": "string"
    }
  ],
  "hiddenCriteria": [ { "label": "string", "description": "string" } ],
  "criteriaCandidates": [ "string", "..." ]
}

Rules for scoring:
- At least 3 criteria, each with unique id, suggestedWeight integer 1-5.
- At least 2 options, unique ids.
- Every option.suggestedScores must include EVERY criterion id with integer 1-5.
- At least one hiddenCriteria entry.
- criteriaCandidates: 6-10 short (<=40 char) unique candidate criterion-name strings the user could pick from before proposing their own criteria. Include your real criteria's labels (verbatim) plus 3-6 plausible-but-wrong distractor labels of similar tone and length, no giveaway markers. Shuffle the order so the correct ones are NOT grouped together or first.
${adapt ? `\n${adapt}` : ""}`;
}

export function buildGeopoliticsEvaluativePrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const topicLine = scenarioBlock
    ? `${scenarioBlock}${domainHint}`
    : `Topic: ${input.domain}`;

  return `You are generating a geopolitical evaluative exercise. Return ONLY valid JSON (no markdown fences).

User context: ${ctx}

${topicLine}

Generate a policy decision scenario where a country or organization must choose between 3–4 strategic options.

Use the SCORING variant ONLY (variant must be "scoring" - do not return matrix).

Requirements:
- criteria must represent DIFFERENT STAKEHOLDER INTERESTS (not abstract qualities like "feasibility")
  Examples: "Domestic political support", "Alliance credibility", "Economic cost", "Rival's likely response", "Regional stability impact", "Precedent setting"
- Each criterion's description must name whose interest it primarily serves
- suggestedWeight reflects the GENERATING ACTOR's priorities (name that actor in scenario and stakeholderNote)
- hiddenCriteria: include 2–3 stakeholder perspectives the user likely will not weight (e.g. domestic opposition in Country X, precedent for smaller states watching)

Criterion and score ID rule (critical):
- Assign criterion id values first (e.g. crit_domestic, crit_alliance). Use stable snake_case ids.
- Every key in each option's suggestedScores MUST exactly match one of those criterion id strings - no labels, no typos, no extra keys.

Return scoring variant JSON:
{
  "variant": "scoring",
  "title": string,
  "scenario": string (include the deciding actor explicitly: "You are advising [Country/Org]..."),
  "stakeholderNote": string (primary decision-maker and 2–3 other affected stakeholders),
  "criteria": [ { "id", "label", "description", "suggestedWeight": 1-5 } ],
  "options": [ { "id", "title", "description", "suggestedScores": { "<criterion id>": 1-5, ... }, "explanation" } ],
  "hiddenCriteria": [ { "label", "description" } ],
  "criteriaCandidates": [ "string", "..." ],
  "stakeholderCandidates": [ "string", "..." ]
}

Minimums: at least 4 criteria, at least 3 options, at least 2 hiddenCriteria.
Every option.suggestedScores must include every criterion id with integer 1–5.
criteriaCandidates: 6-10 short (<=40 char) unique candidate criterion-name strings the user could pick from before proposing their own criteria. Include your real criteria's labels (verbatim) plus 3-6 plausible-but-wrong distractor labels of similar tone and length, no giveaway markers. Shuffle the order.
stakeholderCandidates: 6-10 short (<=40 char) unique candidate actor/stakeholder-name strings the user could pick from before mapping stakeholders. Include the real stakeholders named in stakeholderNote (verbatim) plus 3-6 plausible-but-uninvolved distractor actors, shuffled.${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildEvaluativeDealbreakerPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const aboutLine = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nYou are generating a structured non-compensatory (deal-breaker) evaluative-thinking exercise anchored to the user's scenario above.${ctx}`
    : `You are generating a structured non-compensatory (deal-breaker) evaluative-thinking exercise about: ${input.domain}.${ctx}`;

  return `${aboutLine}

Always use the SCORING variant (variant must be "scoring" - do not return matrix).

This exercise teaches non-compensatory decision-making: some criteria are hard constraints ("deal-breakers") that disqualify an option outright if scored poorly, no matter how well it scores on everything else.

Return ONLY a single JSON object (no markdown fences):
{
  "variant": "scoring",
  "title": "string",
  "scenario": "string",
  "criteria": [
    { "id": "c1", "label": "string", "description": "string", "isDealbreaker": true, "suggestedWeight": 1 }
  ],
  "options": [
    {
      "id": "o1",
      "title": "string",
      "description": "string",
      "suggestedScores": { "c1": 3 },
      "explanation": "string"
    }
  ],
  "hiddenCriteria": [ { "label": "string", "description": "string" } ],
  "criteriaCandidates": [ "string", "..." ]
}

Rules:
- At least 3 criteria, each with unique id, suggestedWeight integer 1-5.
- Mark 1 to 3 criteria with "isDealbreaker": true - these must represent hard constraints (e.g. safety, legal compliance, budget ceiling), not soft preferences. Most criteria should NOT be dealbreakers.
- Each dealbreaker criterion's description must concretely state what a score of 1-2 means as a failure of that constraint (e.g. "1-2 means the option is legally non-compliant and cannot proceed").
- At least 2 options, unique ids.
- Every option.suggestedScores must include EVERY criterion id with integer 1-5.
- At least one hiddenCriteria entry.
- criteriaCandidates: 6-10 short (<=40 char) unique candidate criterion-name strings the user could pick from before proposing their own criteria. Include your real criteria's labels (verbatim, including the dealbreaker ones) plus 3-6 plausible-but-wrong distractor labels of similar tone and length, no giveaway markers. Shuffle the order.
${adapt ? `\n${adapt}` : ""}`;
}

export function buildEvaluativeUncertaintyPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const aboutLine = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nYou are generating a structured decision-under-uncertainty evaluative exercise anchored to the user's scenario above.${ctx}`
    : `You are generating a structured decision-under-uncertainty evaluative exercise about: ${input.domain}.${ctx}`;

  return `${aboutLine}

Always use the UNCERTAINTY variant (variant must be "uncertainty").

This exercise teaches expected-value reasoning: each option has several mutually exclusive, collectively exhaustive possible outcomes, each with a probability and a payoff.

Return ONLY a single JSON object (no markdown fences):
{
  "variant": "uncertainty",
  "title": "string",
  "scenario": "string",
  "options": [
    {
      "id": "o1",
      "title": "string",
      "description": "string",
      "outcomes": [
        { "id": "out1", "label": "string", "probability": 0.6, "payoff": 1000, "explanation": "string" }
      ]
    }
  ]
}

Rules:
- 2 to 5 options, unique ids.
- Each option has 2 to 5 outcomes, unique ids within that option, that are mutually exclusive and collectively exhaustive.
- Each option's outcome probabilities MUST sum to 1.0.
- payoff is a signed number in ONE consistent, comparable unit across ALL options (e.g. dollars) - do not mix units.
- Vary risk profile across options: include at least one relatively safe option (high-probability, modest-payoff outcomes) and at least one riskier option (low-probability, high-payoff outcome), so the expected-value ranking is not obvious from the titles alone.
- explanation should justify the probability/payoff estimate briefly.
${adapt ? `\n${adapt}` : ""}`;
}
