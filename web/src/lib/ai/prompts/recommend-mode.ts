import { EXERCISE_MODE_DESCRIPTIONS } from "@/lib/ai/prompts/exercise-mode-catalog";
import { catalogGroupOf } from "@/lib/exercise/exercise-domain-catalog";

/** Rank every exercise mode for a topic ("start from a topic"). */
export function buildRecommendModePrompt(topic: string): string {
  const modes = Object.keys(EXERCISE_MODE_DESCRIPTIONS);
  const modesList = Object.entries(EXERCISE_MODE_DESCRIPTIONS)
    .map(([mode, desc]) => `- ${mode}: ${desc}`)
    .join("\n");
  const group = catalogGroupOf(topic);
  const hint = group?.bestFor?.length
    ? `\nHint: this topic is in the "${group.label}" group, which usually fits ${group.bestFor.join(", ")}. Use it as a hint, not a rule.`
    : "";

  return `You are a thinking-skills tutor. Given a topic, rank which thinking exercise modes fit best for practicing with that topic.

Modes:
${modesList}

Topic: "${topic}"${hint}

Return a JSON array of exactly ${modes.length} objects, one per mode, ranked best-fit first. Each object has:
- "mode": one of ${modes.map((m) => `"${m}"`).join(", ")}
- "reason": one plain sentence (under 25 words) on what the user would practise with this topic in this mode, or why it fits poorly.`;
}
