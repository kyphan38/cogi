import type { GenerativeExerciseRow } from "@/lib/types/exercise";

export function buildGenerativeRubricPrompt(exercise: GenerativeExerciseRow): string {
  const qa = exercise.prompts
    .map((p) => {
      const a = exercise.answers[p.id]?.trim() || "";
      return `${p.id}: ${p.question}\n${a}`;
    })
    .join("\n\n");
  const debate =
    exercise.debateOpening || exercise.debateTurns.length
      ? `${exercise.debateOpening ?? ""}\n${exercise.debateTurns
          .map((t) => `User: ${t.userText}\nAssistant: ${t.assistantText}`)
          .join("\n")}`
      : "";
  return `You evaluate written reasoning for calibration (not shown as a letter grade to the user).

Return ONLY JSON: { "overall": <integer 0-100>, "clarity": 1-5, "counterargument": 1-5, "falsifiability": 1-5 }
Use "overall" as a holistic 0-100 score combining clarity, strength of counterarguments considered, and falsifiability/specificity.

Domain: ${exercise.domain}
Title: ${exercise.title}

Answers:
${qa}

Debate context:
${debate}${
    exercise.isGeopolitics
      ? `

Geopolitics scenario-planning rubric emphasis:
- p1: clarity and explicitness of assumptions behind the base-case forecast
- p2 vs p3: whether upside and downside futures are genuinely distinct, not cosmetic variants
- p4: whether the recommended action is robust under the downside crisis, not only the base/upside cases
- Debate: did the user engage with motivation projection and precedent misuse challenges?

Still return the same JSON shape; reflect these dimensions in "overall" and sub-scores.`
      : ""
  }
`;
}
