import type { GenerativeStage } from "@/lib/ai/validators/generative";

export function buildGenerativeGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  generativeStage: GenerativeStage;
  adaptationAppendix?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();

  const stageBlock =
    input.generativeStage === "edit"
      ? `Stage EDIT (first exercises): For each of the 4 prompts, include "draftText" with a substantive draft (2-5 sentences) the user will edit — NOT empty.`
      : input.generativeStage === "hint"
        ? `Stage HINT: For each prompt, include "hints" as an array of exactly 2 or 3 short bullet strings (not full drafts).`
        : `Stage INDEPENDENT: Do NOT include draftText or hints. Optionally include "spareHint" per prompt (one sentence) for an optional "show hint" button — may be omitted.`;

  return `You are generating a structured generative-thinking exercise about: ${input.domain}.${ctx}

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

Prompt themes should cover: core problem, alternatives, strongest counterargument to preferred path, and failure / fallback plan — adapted to the domain.

Exactly 4 prompts. Unique ids. Questions must be self-contained.${adapt ? `\n\n${adapt}` : ""}`;
}
