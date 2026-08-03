import type { GenerativeStage } from "@/lib/ai/validators/generative";
import { buildDomainHint, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

export function buildGenerativeGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  generativeStage: GenerativeStage;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);

  const stageBlock = generativeStageBlock(input.generativeStage);

  const intro = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nYou are generating a structured generative-thinking exercise anchored to the user's scenario above.${ctx}`
    : `You are generating a structured generative-thinking exercise about: ${input.domain}.${ctx}`;

  return `${intro}

Scaffold stage for this exercise: "${input.generativeStage}".
${stageBlock}

Return ONLY JSON:
{
  "title": "string",
  "scenario": "short framing paragraph",
  "prompts": [
    {
      "id": "p1",
      "question": "Clear question text",
      ...stage-specific fields...
    },
    ... exactly 4 prompts total with ids p1,p2,p3,p4 or any unique ids ...
  ]
}

Prompt themes should cover: core problem, alternatives, strongest counterargument to preferred path, and failure / fallback plan - adapted to the domain.

Exactly 4 prompts. Unique ids. Questions must be self-contained.${adapt ? `\n\n${adapt}` : ""}`;
}

function generativeStageBlock(generativeStage: GenerativeStage): string {
  return generativeStage === "edit"
    ? `Stage EDIT (first exercises): For each of the 4 prompts, include "draftText" with a substantive draft (2-5 sentences) the user will edit - NOT empty.`
    : generativeStage === "hint"
      ? `Stage HINT: For each prompt, include "hints" as an array of exactly 2 or 3 short bullet strings (not full drafts).`
      : `Stage INDEPENDENT: Do NOT include draftText or hints. Optionally include "spareHint" per prompt (one sentence) for an optional "show hint" button - may be omitted.`;
}

export function buildGeopoliticsGenerativePrompt(input: {
  domain: string;
  userContext?: string;
  generativeStage: GenerativeStage;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const stageBlock = generativeStageBlock(input.generativeStage);

  const topicLine = scenarioBlock
    ? `${scenarioBlock}${domainHint}`
    : `Topic: ${input.domain}`;

  return `You are generating a geopolitical scenario-planning exercise. Return ONLY valid JSON (no markdown fences).

User context: ${ctx}

${topicLine}

Scaffold stage for this exercise: "${input.generativeStage}".
${stageBlock}

Generate a scenario about a geopolitical situation that could develop in multiple directions.
The scenario must be 2-3 paragraphs: name realistic regions and actors (may be composite, not necessarily real headlines). Futures must genuinely diverge.

The 4 prompts MUST use ids p1, p2, p3, p4 exactly and follow this structure:
- p1: "What is the most likely outcome in 12 months, and what assumptions does that prediction rest on?"
- p2: "Describe a plausible upside surprise - things go better than expected. What would have to happen?"
- p3: "Describe a plausible downside crisis - things go worse than expected. What triggers it?"
- p4: "Given these three scenarios, what would you recommend [name the decision-maker] do NOW that is robust across all three futures?"

You may phrase questions naturally but each must cover its theme. Name the deciding actor in the scenario and in p4.

Return:
{
  "title": string,
  "scenario": string,
  "prompts": [
    { "id": "p1", "question": string, ...stage-specific fields },
    { "id": "p2", "question": string, ... },
    { "id": "p3", "question": string, ... },
    { "id": "p4", "question": string, ... }
  ]
}

Exactly 4 prompts with ids p1-p4.${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildReframingGenerativePrompt(input: {
  domain: string;
  userContext?: string;
  generativeStage: GenerativeStage;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const stageBlock = generativeStageBlock(input.generativeStage);

  const intro = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nYou are generating a problem-reframing exercise anchored to the user's scenario above.${ctx}`
    : `You are generating a problem-reframing exercise about: ${input.domain}.${ctx}`;

  return `${intro}

The scenario must state a problem the "obvious" or naive way - the way most people would first frame it, including one unexamined assumption baked into that framing.

Scaffold stage for this exercise: "${input.generativeStage}".
${stageBlock}

Return ONLY JSON:
{
  "title": "string",
  "scenario": "short framing paragraph stating the problem the naive/obvious way",
  "prompts": [
    { "id": "p1", "question": "Restate the problem as a 'How might we...' reformulation of the naive framing above.", ...stage-specific fields... },
    { "id": "p2", "question": "Reframe the problem around the underlying need rather than the stated want (a Jobs-to-be-Done style reframe).", ...stage-specific fields... },
    { "id": "p3", "question": "Reframe by flipping whose problem this really is - a different stakeholder's framing.", ...stage-specific fields... },
    { "id": "p4", "question": "Reframe by questioning the constraint the naive framing assumed is fixed - what changes if it isn't?", ...stage-specific fields... }
  ]
}

Each of the 4 prompts must be a genuinely distinct reframing technique (How-Might-We restatement, underlying-need reframe, stakeholder-flip reframe, constraint-removal reframe) - not 4 wordings of the same idea. Questions must be self-contained and adapted to the domain/scenario above (you may phrase them naturally as long as each covers its theme).

Exactly 4 prompts. Unique ids.${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildInversionGenerativePrompt(input: {
  domain: string;
  userContext?: string;
  generativeStage: GenerativeStage;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const stageBlock = generativeStageBlock(input.generativeStage);

  const intro = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nYou are generating an inversion / pre-mortem exercise anchored to the user's scenario above.${ctx}`
    : `You are generating an inversion / pre-mortem exercise about: ${input.domain}.${ctx}`;

  return `${intro}

The scenario must state a concrete goal or initiative the user is pursuing (not a problem to solve - a plan already in motion).

Scaffold stage for this exercise: "${input.generativeStage}".
${stageBlock}

Return ONLY JSON:
{
  "title": "string",
  "scenario": "short framing paragraph stating the goal/initiative being pursued",
  "prompts": [
    { "id": "p1", "question": "Imagine this fails catastrophically. Describe one specific, causally distinct failure path.", ...stage-specific fields... },
    { "id": "p2", "question": "Describe a second failure path, causally independent of the first.", ...stage-specific fields... },
    { "id": "p3", "question": "Describe a third failure path - ideally one that would go unnoticed until too late (a silent failure).", ...stage-specific fields... },
    { "id": "p4", "question": "Given these three failure paths, what single change made today would do the most to prevent the most dangerous one?", ...stage-specific fields... }
  ]
}

The first three prompts must each describe a causally distinct failure path (not restatements of the same underlying risk). The fourth prompt must ask the user to synthesize ONE preventive action targeting the highest-leverage failure path identified, not just the first one listed. This is not red-teaming an existing plan's defenses - it is generating brand-new failure insight from scratch by inverting the goal.

Exactly 4 prompts. Unique ids.${adapt ? `\n\n${adapt}` : ""}`;
}

export const GEOPOLITICS_GENERATIVE_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed geopolitics generative validation. Return ONLY valid JSON:
- title, scenario (2-3 detailed paragraphs), prompts array length 4
- prompt ids MUST be exactly p1, p2, p3, p4
- p1: base case / 12-month outcome + assumptions; p2: upside surprise; p3: downside crisis; p4: robust recommendation NOW for named decision-maker
- stage-specific fields per generativeStage rules (draftText, hints, or neither)
`;
