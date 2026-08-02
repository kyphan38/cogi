import { NO_INDEX_REFERENCE_RULE } from "@/lib/ai/prompts/perspective-clarity-directives";
import type {
  EvaluativeAxisSpec,
  EvaluativeCriterion,
} from "@/lib/types/exercise";

export type EvaluativeCriteriaFeedbackFramework =
  | { kind: "axes"; axisX: EvaluativeAxisSpec; axisY: EvaluativeAxisSpec }
  | { kind: "criteria"; criteria: EvaluativeCriterion[] };

export function buildEvaluativeCriteriaFeedbackPrompt(input: {
  title: string;
  domain: string;
  scenario: string;
  userProposedCriteria: { name: string; rationale: string }[];
  aiFramework: EvaluativeCriteriaFeedbackFramework;
}): string {
  const userCriteria = input.userProposedCriteria
    .map((c, i) => `${i + 1}. "${c.name}" - ${c.rationale}`)
    .join("\n");

  const frameworkBlock =
    input.aiFramework.kind === "axes"
      ? `Axes: X - ${input.aiFramework.axisX.label} (${input.aiFramework.axisX.lowLabel} → ${input.aiFramework.axisX.highLabel})
      Y - ${input.aiFramework.axisY.label} (${input.aiFramework.axisY.lowLabel} → ${input.aiFramework.axisY.highLabel})`
      : input.aiFramework.criteria
          .map((c) => `- "${c.label}": ${c.description}`)
          .join("\n");

  return `You are a collaborative thinking coach (not a judge). The user is about to compare their own self-proposed evaluation criteria against a framework you generated for the same scenario, before they've seen it.

${NO_INDEX_REFERENCE_RULE}

Domain: ${input.domain}
Title: ${input.title}
Scenario:
${input.scenario}

User's proposed criteria (before seeing your framework):
${userCriteria}

Your framework for this scenario:
${frameworkBlock}

Write a short critique (150-250 words, plain text, no JSON, no markdown headers) of the user's proposed criteria that:
- Quotes each user criterion by its name when discussing it.
- Calls out any real gap - a dimension your framework captures that their criteria miss entirely.
- Calls out any overlap or redundancy among their OWN criteria (only if genuinely present - do not invent one).
- Names a genuine strength in what they proposed.
- Does not give a numeric grade or score.
- Ends by inviting them to revise before continuing, without being prescriptive.`;
}
