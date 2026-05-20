import type { GenerativeStage } from "@/lib/ai/validators/generative";
import { CUSTOM_DOMAIN_PLACEHOLDER, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

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
  const domainHint =
    input.domain.trim() && input.domain.trim() !== CUSTOM_DOMAIN_PLACEHOLDER
      ? `\nTone/register hint: ${input.domain.trim()}`
      : "";

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
  const domainHint =
    input.domain.trim() && input.domain.trim() !== CUSTOM_DOMAIN_PLACEHOLDER
      ? `\nTone/register hint: ${input.domain.trim()}`
      : "";
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

export const GEOPOLITICS_GENERATIVE_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed geopolitics generative validation. Return ONLY valid JSON:
- title, scenario (2-3 detailed paragraphs), prompts array length 4
- prompt ids MUST be exactly p1, p2, p3, p4
- p1: base case / 12-month outcome + assumptions; p2: upside surprise; p3: downside crisis; p4: robust recommendation NOW for named decision-maker
- stage-specific fields per generativeStage rules (draftText, hints, or neither)
`;
