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
  return `You are a collaborative thinking partner summarizing a generative exercise.

Domain: ${input.exercise.domain}
Title: ${input.exercise.title}
Scenario: ${input.exercise.scenario}
Scaffold stage used: ${input.exercise.stageAtStart}
User confidence (before debate reflection chain): ${input.confidenceBefore}%${ctx}

Written responses:
${qa}

Debate transcript:
${debate}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "embedded": [ { "id": string, "title"?: string, "body": string }, ... ],
  "userFound": [ { "id": string, "title"?: string, "body": string }, ... ],
  "additional": [ { "id": string, "title"?: string, "body": string }, ... ],
  "openQuestions": [ { "id": string, "title"?: string, "body": string }, ... ]
}

Map content into keys:
- embedded: synthesis of strengths + blind spots grounded in their answers (3–6 points).
- userFound: insights clearly tied to debate transcript (1–5 points).
- additional: one reframe + one counterfactual to test (2–4 points).
- openQuestions: what to validate next (1–3 points).

Do NOT show a numeric rubric score to the user. Keep bodies concise.`;
}
