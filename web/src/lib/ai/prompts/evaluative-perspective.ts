import { buildPerspectiveClarityPreamble } from "@/lib/ai/prompts/perspective-clarity-directives";
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
  const clarity = buildPerspectiveClarityPreamble();

  return `You are a collaborative thinking coach (not a harsh grader).

${clarity}

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
  "perspectiveFormat": "clarity_v2",
  "title": string (echo exercise title),
  "suitableFor": "Suitable for <concrete audience>",
  "placementCritiques": [
    {
      "optionId": "unique_id",
      "optionTitle": "option title from exercise",
      "userQuadrant": "top-left" | "top-right" | "bottom-left" | "bottom-right",
      "userValueContext": "You placed Option Title in top-left because ... (state actual placement; infer brief rationale if user gave none)",
      "aiEvaluationText": "You placed Option Title in top-left... However, from an alternative framing..."
    }
  ],
  "openQuestions": ["optional 1-3 strings"]
}

Rules:
- One placementCritiques row per option in the exercise.
- aiEvaluationText must follow the Clarity Blueprint (state placement, issue, alternative).
- Note which user-proposed criteria they identified vs missed in relevant rows.
- Do not give a numeric grade.
- State option titles plainly, with no surrounding quotation marks (e.g. write Option Title, not 'Option Title') - the app highlights option names visually, so quotes are redundant clutter. Reserve quotation marks only for verbatim excerpts of the user's own written text.`;
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
  const geoBlock =
    input.exercise.isGeopolitics || input.exercise.stakeholderNote
      ? `

Geopolitics stakeholder context:
AI stakeholder ground truth:
${input.exercise.stakeholderNote ?? "(none)"}

User stakeholder mapping (before scoring):
${JSON.stringify(input.exercise.userStakeholderMapping ?? [], null, 2)}

Acknowledge stakeholders the user named vs missed; relate weight divergence to whose interests are overweighted or neglected. Surface hiddenCriteria as blind spots gently in relevant critiqueMatrix rows.`
      : "";

  const clarity = buildPerspectiveClarityPreamble();

  return `You are a collaborative thinking coach.

${clarity}

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
  "perspectiveFormat": "clarity_v2",
  "title": string (echo exercise title),
  "suitableFor": "Suitable for <concrete audience>",
  "critiqueMatrix": [
    {
      "criterionId": "c1",
      "criterionLabel": "human label",
      "userAssignedWeight": 4,
      "userValueContext": "You weighted Alliance Credibility at 4/5 and scored Option A as 3, Option B as 5 on this criterion (summarize all user weights/scores for this row)",
      "aiEvaluationText": "You weighted Alliance Credibility as 4 because you noted that '...'. However, from an oppositional stakeholder standpoint..."
    }
  ],
  "openQuestions": ["optional 1-3 strings"]
}

Rules:
- One critiqueMatrix row per criterion in the exercise.
- userValueContext must summarize the user's weight AND per-option scores for that criterion (even if only numeric).
- Compare to suggestedWeight and suggestedScores in aiEvaluationText.
- Note which criteria the user identified vs missed.${geoBlock}
- State criterion and option names plainly, with no surrounding quotation marks (e.g. write Alliance Credibility, not 'Alliance Credibility') - the app highlights them visually, so quotes are redundant clutter. Reserve quotation marks only for verbatim excerpts of the user's own written text.

No numeric grade for the user.`;
}
