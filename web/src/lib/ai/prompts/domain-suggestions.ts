import { EXERCISE_MODE_DESCRIPTIONS } from "@/lib/ai/prompts/exercise-mode-catalog";
import { EXERCISE_DOMAIN_CATALOG } from "@/lib/exercise/exercise-domain-catalog";
import type { ThinkingType } from "@/lib/types/exercise";
import { LIFE_AREAS } from "@/lib/exercise/judgment-levels";
import { STRATEGY_AREAS } from "@/lib/exercise/strategy-levels";

/** The quick-pick areas each exercise shows at setup, so ideas land in the same places. */
const QUICK_AREAS: Partial<Record<ThinkingType, readonly string[]>> = {
  judgment: LIFE_AREAS,
  reframe: LIFE_AREAS,
  strategy: STRATEGY_AREAS,
};

export const DOMAIN_SUGGESTION_COUNT = 6;

/**
 * "Start from a mode": the user picked a mode but has no topic. Ask for a batch of
 * domain + sub-domain pairs that suit the mode, anchored on the catalog groups that
 * fit it, varied, and different from what the user practised recently.
 */
export function buildDomainSuggestionsPrompt(params: {
  mode: ThinkingType;
  exclude: string[];
  recentDomains: string[];
  userContext?: string;
}): string {
  const anchors = EXERCISE_DOMAIN_CATALOG.filter((g) => g.bestFor?.includes(params.mode))
    .map((g) => `- ${g.label}: ${g.domains.filter((d) => d !== "Custom domain").slice(0, 5).join("; ")}`)
    .join("\n");
  const quick = QUICK_AREAS[params.mode];
  const avoid = [...params.exclude, ...params.recentDomains];
  return `You are a thinking-skills tutor helping a learner choose what to practise.

Exercise mode: "${params.mode}" - ${EXERCISE_MODE_DESCRIPTIONS[params.mode]}

Areas that usually fit this mode (use them as a starting point; you may go beyond them):
${anchors}
${quick ? `\nThe exercise's own quick areas (cover several of them): ${quick.join(", ")}\n` : ""}${params.userContext?.trim() ? `\nUser context (use it to make some ideas personal): ${params.userContext.trim()}\n` : ""}
Do not suggest these or close variants (already shown or recently practised):
${avoid.length ? avoid.map((a) => `- ${a}`).join("\n") : "(none)"}

Return ONLY a JSON array (no markdown fences, no prose) of exactly ${DOMAIN_SUGGESTION_COUNT} objects:
- "domain": a broad area, 1-5 words (for example "Relationships & family").
- "subdomain": a specific topic inside it that works well for this mode, 4-12 words (for example "Deciding who looks after an ageing parent"). It becomes the exercise topic.
- "why": one plain sentence (under 20 words): what the user will practise with it in this mode.

Rules:
- Spread the ${DOMAIN_SUGGESTION_COUNT} ideas over at least 4 different domains: everyday life, work, money, society, science or technology.
- Common, real situations that many people meet. No niche jargon.
- English only.`;
}
