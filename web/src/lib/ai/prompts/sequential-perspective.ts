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
  perspectiveAName?: string;
  perspectiveBName?: string;
  userOrderedStepIdsB?: string[];
  criticalErrorsB?: SequentialCriticalError[];
  timeLimitMinutes?: number;
  elapsedSeconds?: number;
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  const ideal = [...input.steps]
    .sort((a, b) => a.correctPosition - b.correctPosition)
    .map((s) => s.id);

  const geoBlock =
    input.perspectiveAName &&
    input.perspectiveBName &&
    input.userOrderedStepIdsB &&
    input.criticalErrorsB
      ? `

Geopolitics dual-actor context (diagnostic - do not assign a second numeric accuracy score):
- Perspective A (${input.perspectiveAName}): user's primary submitted order above was scored against this actor's intended sequence.
- Perspective B (${input.perspectiveBName})'s intended order (reference, ideal order by step id): ${[...input.steps]
          .sort((a, b) => (a.correctPositionB ?? 0) - (b.correctPositionB ?? 0))
          .map((s) => s.id)
          .join(" → ")}
- User's submitted order for Perspective B: ${input.userOrderedStepIdsB.join(" → ")}
- Critical errors specific to Perspective B's priorities:
${JSON.stringify(input.criticalErrorsB, null, 2)}

In your reflection, weave in both actors where relevant: note where the same step earns a different position across A and B and why that reflects a genuine difference in priorities (not an error), and call out anywhere the user seemed to just copy Perspective A's order into B's instead of reasoning about B's incentives.`
      : "";

  const triageBlock =
    typeof input.timeLimitMinutes === "number"
      ? `

Crisis-triage context (diagnostic - do not assign a second numeric accuracy score):
- Time limit given to the user: ${input.timeLimitMinutes} minute(s)${
          typeof input.elapsedSeconds === "number"
            ? ` (user took ${Math.round(input.elapsedSeconds)}s)`
            : ""
        }
- Each step carries a severity ("critical" / "major" / "minor") baked into the steps list above.

In your reflection, emphasize that misordering a "critical" severity step is far more costly than misordering a
"minor" one, even if the overall step count that's out of place looks similar. Praise correct handling of the
critical-severity steps specifically, and call out any critical-severity step the user placed badly.`
      : "";

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

Tone: collaborative peer, not a judge. Do not give a numeric score for the exercise. Keep bodies concise.${geoBlock}${triageBlock}`;
}
