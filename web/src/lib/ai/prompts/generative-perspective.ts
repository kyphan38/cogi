import { buildPerspectiveClarityPreamble } from "@/lib/ai/prompts/perspective-clarity-directives";
import type { GenerativeExerciseRow } from "@/lib/types/exercise";

export function buildGenerativePerspectivePrompt(input: {
  exercise: GenerativeExerciseRow;
  confidenceBefore: number;
  userContext?: string;
}): string {
  const qa = input.exercise.prompts
    .map((p) => {
      const a = input.exercise.answers[p.id]?.trim() || "(empty)";
      return `Q (${p.id}): ${p.question}\nA: ${a}`;
    })
    .join("\n\n");
  const debate =
    input.exercise.debateOpening || input.exercise.debateTurns.length
      ? `Opening challenge:\n${input.exercise.debateOpening ?? ""}\n\nFollow-up exchanges:\n${input.exercise.debateTurns
          .map(
            (t, i) =>
              `--- Round ${i + 1} ---\nUser: ${t.userText}\nAssistant: ${t.assistantText}`,
          )
          .join("\n\n")}`
      : "(no debate recorded)";
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext}` : "";
  const clarity = buildPerspectiveClarityPreamble();

  const geoRules = input.exercise.isGeopolitics
    ? `
Geopolitics scenario-planning (p1 base, p2 upside, p3 downside, p4 robust action):
- Critique assumptions in p1; whether p2/p3 diverge structurally; whether p4 survives p3
- Incorporate strong points from debate on motivations, precedents, or robustness in stepCritiques
- Surface neglected futures or stakeholders; historical analogy misuse where relevant`
    : "";

  return `You are a collaborative thinking partner summarizing a generative exercise.

${clarity}

Domain: ${input.exercise.domain}
Title: ${input.exercise.title}
Scenario: ${input.exercise.scenario}
Scaffold stage used: ${input.exercise.stageAtStart}
User confidence (before debate reflection chain): ${input.confidenceBefore}%${ctx}

Written responses:
${qa}

Debate transcript:
${debate}
${geoRules}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "clarity_v2",
  "title": string (echo exercise title),
  "suitableFor": "Suitable for <concrete audience>",
  "stepCritiques": [
    {
      "phaseId": "p1",
      "promptQuestion": "exact question text from exercise",
      "userResponseSnippet": "exact text segment the user typed for this prompt",
      "critique": "You wrote that '[snippet]'... This rests on an implicit assumption that...",
      "remediationAlternative": "An analyst looking for high-fidelity alternatives would have framed this as..."
    }
  ],
  "openQuestions": ["optional 1-3 strings - indicators that would falsify scenario branches if geopolitics"]
}

Rules:
- One stepCritiques row per prompt in the exercise (all prompts).
- userResponseSnippet must quote or mirror the user's actual answer (use "(empty)" only if truly blank).
- Weave debate insights into critique where they apply to that step.
- Do NOT show a numeric rubric score to the user.`;
}
