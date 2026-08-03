import type { AnalyticalExerciseRow } from "@/lib/types/exercise";

export function buildAnalyticalSteelmanRubricPrompt(exercise: AnalyticalExerciseRow): string {
  return `You evaluate written reasoning for calibration (not shown as a letter grade to the user).

Return ONLY JSON: { "overall": <integer 0-100> }
Score how well the user's steelman strengthens the stated position, holistically.

Domain: ${exercise.domain}
Title: ${exercise.title}

Position to steelman:
${exercise.passage}

User's steelman:
${exercise.steelmanText ?? ""}

Score highly if the steelman:
- Genuinely strengthens the position rather than restating or watering it down
- Preempts the strongest objection a critic would raise
- Is intellectually honest - a real advocate's best case, not a strawman-in-disguise or an unrelated tangent

Score low if it merely repeats the position in different words, ignores the strongest counterargument, or drifts off-topic.
`;
}
