import type { SequentialCriticalError, SequentialStepSpec } from "@/lib/types/exercise";

export function buildSequentialPerspectivePrompt(input: {
  title: string;
  scenario: string;
  steps: SequentialStepSpec[];
  criticalErrors: SequentialCriticalError[];
  userOrderedStepIds: string[];
  confidenceBefore: number;
  domain: string;
  userContext?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  const ideal = [...input.steps]
    .sort((a, b) => a.correctPosition - b.correctPosition)
    .map((s) => s.id);

  return `You are a thoughtful peer helping someone practice sequencing and dependencies in the domain: ${input.domain}.
User context (may be empty): ${ctx}

Exercise title: ${input.title}
Scenario:
---
${input.scenario}
---

Steps (with dependencies and flexibility flags):
${JSON.stringify(input.steps, null, 2)}

Critical errors the model considered important if order is wrong:
${JSON.stringify(input.criticalErrors, null, 2)}

Ideal dependency-respecting order (reference): ${ideal.join(" → ")}

User's submitted order (left to right = first to last in time): ${input.userOrderedStepIds.join(" → ")}

User self-reported confidence before seeing your notes: ${input.confidenceBefore}%

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "embedded": [ { "id": string, "title"?: string, "body": string }, ... ],
  "userFound": [ { "id": string, "title"?: string, "body": string }, ... ],
  "additional": [ { "id": string, "title"?: string, "body": string }, ... ],
  "openQuestions": [ { "id": string, "title"?: string, "body": string }, ... ]
}

Map content into keys:
- embedded: intended dependency chain + critical path framing (3–6 points). Use titles like "Intended chain", "Critical path".
- userFound: where user's order diverges; explain why both orders might be valid when flexibility applies (1–5 points).
- additional: trade-offs / context angles (2–5 points).
- openQuestions: uncertainties / what to validate next (1–4 points).

Tone: collaborative peer, not a judge. Do not give a numeric score for the exercise. Keep bodies concise.`;
}
