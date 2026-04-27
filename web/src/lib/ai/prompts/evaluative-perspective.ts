import type { EvaluativeMatrixRow, EvaluativeScoringRow } from "@/lib/types/exercise";

export function buildEvaluativeMatrixPerspectivePrompt(input: {
  title: string;
  domain: string;
  scenario: string;
  exercise: EvaluativeMatrixRow;
  confidenceBefore: number;
  userContext?: string;
}): string {
  const placements = JSON.stringify(input.exercise.placements, null, 2);
  const intended = input.exercise.options
    .map(
      (o) =>
        `- ${o.id} (${o.title}): intended quadrant ${o.intendedQuadrant} - ${o.explanation}`,
    )
    .join("\n");
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext}` : "";
  const proposed = input.exercise.userProposedCriteria ?? null;
  return `You are a collaborative thinking coach (not a harsh grader).

Domain: ${input.domain}
Title: ${input.title}
Scenario:
${input.exercise.scenario}

User proposed these criteria before seeing the framework:
${JSON.stringify(proposed, null, 2)}

Axes: X - ${input.exercise.axisX.label} (${input.exercise.axisX.lowLabel} → ${input.exercise.axisX.highLabel})
      Y - ${input.exercise.axisY.label} (${input.exercise.axisY.lowLabel} → ${input.exercise.axisY.highLabel})

User stated confidence before seeing your notes: ${input.confidenceBefore}%${ctx}

Intended placements (for your reference - do not present as a numeric score):
${intended}

User's quadrant placements (option id → quadrant):
${placements}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "embedded": [ { "id": string, "title"?: string, "body": string }, ... ],
  "userFound": [ { "id": string, "title"?: string, "body": string }, ... ],
  "additional": [ { "id": string, "title"?: string, "body": string }, ... ],
  "openQuestions": [ { "id": string, "title"?: string, "body": string }, ... ]
}

Map content into keys:
- embedded: compare user placements vs intended reasoning; call out key mismatches without harsh judgment (3–6 points).
- userFound: acknowledge strong intuitive placements / surprising-but-defensible placements (0–4 points).
- additional: one alternative framing + one trade-off lens (2–4 points).
- openQuestions: what information would change the map (1–3 points).

Also, briefly note which criteria the user identified vs missed, and whether their framing reveals a different but defensible evaluation approach.

Do not give a numeric grade. Keep bodies concise.`;
}

export function buildEvaluativeScoringPerspectivePrompt(input: {
  title: string;
  domain: string;
  exercise: EvaluativeScoringRow;
  confidenceBefore: number;
  userContext?: string;
}): string {
  const crit = input.exercise.criteria
    .map(
      (c) =>
        `- ${c.id} ${c.label} (AI suggested weight ${c.suggestedWeight}): ${c.description}`,
    )
    .join("\n");
  const opts = input.exercise.options
    .map((o) => {
      const sug = JSON.stringify(o.suggestedScores);
      const usr = JSON.stringify(input.exercise.scores[o.id] ?? {});
      const w = JSON.stringify(
        Object.fromEntries(
          input.exercise.criteria.map((c) => [
            c.id,
            input.exercise.criterionWeights[c.id] ?? "",
          ]),
        ),
      );
      return `Option ${o.id} (${o.title})\n  AI suggested scores: ${sug}\n  User weights (by criterion id): ${w}\n  User scores: ${usr}\n  AI note: ${o.explanation}`;
    })
    .join("\n\n");
  const hidden = input.exercise.hiddenCriteria
    .map((h) => `- ${h.label}: ${h.description}`)
    .join("\n");
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext}` : "";
  const proposed = input.exercise.userProposedCriteria ?? null;
  return `You are a collaborative thinking coach.

Domain: ${input.domain}
Title: ${input.title}
Scenario:
${input.exercise.scenario}

User confidence before this reflection: ${input.confidenceBefore}%${ctx}

User proposed these criteria before seeing the framework:
${JSON.stringify(proposed, null, 2)}

Criteria:
${crit}

Options and comparisons:
${opts}

Hidden criteria the user may not have weighted (surface gently):
${hidden}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "embedded": [ { "id": string, "title"?: string, "body": string }, ... ],
  "userFound": [ { "id": string, "title"?: string, "body": string }, ... ],
  "additional": [ { "id": string, "title"?: string, "body": string }, ... ],
  "openQuestions": [ { "id": string, "title"?: string, "body": string }, ... ]
}

Map content into keys:
- embedded: weight divergence vs suggestedWeight; scoring surprises vs suggestedScores (3–6 points).
- userFound: places the user's scoring looks coherent even if different from AI (0–4 points).
- additional: hiddenCriteria themes worth reconsidering (2–4 points).
- openQuestions: what would change the weighting model (1–3 points).

Also, briefly note which criteria the user identified vs missed, and whether their framing reveals a different but defensible evaluation approach.

No numeric grade for the user. Keep bodies concise.`;
}
