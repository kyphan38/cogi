export function buildSequentialGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}

Generate a ${input.domain} process-ordering exercise with **8 steps**.

Requirements:
- Steps should have clear dependencies (A must happen before B)
- Include 2-3 steps where order is genuinely flexible (mark isFlexible: true on those steps)
- Include 1 "trap" step that SEEMS like it should be first but actually depends on something else
- Use step ids like "s1", "s2", ... "s8" (short unique strings, no spaces)

Return a single JSON object with this exact shape:
{
  "title": string,
  "scenario": string (2-3 sentences of context),
  "steps": [
    {
      "id": string,
      "text": string (the step description),
      "correctPosition": number (0-based final order index),
      "dependencies": string[] (ids of steps that must appear before this one; may be empty only for true first steps),
      "isFlexible": boolean,
      "explanation": string (why this position in the ideal order)
    }
  ],
  "criticalErrors": [
    {
      "description": string (e.g. if step X is placed before step Y, what goes wrong),
      "severity": "catastrophic" | "problematic" | "suboptimal"
    }
  ]
}

steps must have exactly 8 items.
criticalErrors must have at least 1 item.${adapt ? `\n\n${adapt}` : ""}`;
}
