import { EXERCISE_MODE_DESCRIPTIONS } from "@/lib/ai/prompts/exercise-mode-catalog";

export function buildRecommendModePrompt(topic: string): string {
  const modesList = Object.entries(EXERCISE_MODE_DESCRIPTIONS)
    .map(([mode, desc]) => `- ${mode}: ${desc}`)
    .join("\n");

  return `You are a thinking-skills tutor. Given a topic, rank which thinking exercise modes fit best for practicing with that topic.

Modes:
${modesList}

Topic: "${topic}"

Return a JSON array of exactly 5 objects, ranked best-fit first. Each object has:
- "mode": one of "analytical", "sequential", "systems", "evaluative", "generative"
- "reason": one sentence explaining why this mode fits (or doesn't) the topic`;
}
