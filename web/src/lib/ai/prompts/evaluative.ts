export function buildEvaluativeGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
}): string {
  const ctx = input.userContext?.trim()
    ? `\nUser context (optional): ${input.userContext.trim()}`
    : "";
  const adapt = input.adaptationAppendix?.trim();
  return `You are generating a structured evaluative-thinking exercise about: ${input.domain}.${ctx}

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
  ]
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
  "hiddenCriteria": [ { "label": "string", "description": "string" } ]
}

Rules for scoring:
- At least 3 criteria, each with unique id, suggestedWeight integer 1-5.
- At least 2 options, unique ids.
- Every option.suggestedScores must include EVERY criterion id with integer 1-5.
- At least one hiddenCriteria entry.
${adapt ? `\n${adapt}` : ""}`;
}
