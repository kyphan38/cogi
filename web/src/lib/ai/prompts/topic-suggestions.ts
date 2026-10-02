import { EXERCISE_MODE_DESCRIPTIONS } from "@/lib/ai/prompts/exercise-mode-catalog";

/** "Already practiced" exclusion block + optional user-context block. */
function buildExcludeBlock(excludeTitles: string[], userContext?: string): string {
  const excludeList = excludeTitles.length > 0 ? excludeTitles.map((t) => `- ${t}`).join("\n") : "(none yet)";
  return `[TOPICS ALREADY PRACTICED - DO NOT SUGGEST THESE OR CLOSE VARIANTS]
${excludeList}
${userContext ? `\n[USER CONTEXT]\n${userContext}\n` : ""}`;
}

const TOPIC_SUGGESTIONS_FOOTER =
  "Titles must be diverse from each other and from the already-practiced list above. Return ONLY the JSON array, no markdown fences, no prose.";

export function buildTopicSuggestionsPrompt(params: {
  area: string;
  kind: "exercise";
  excludeTitles: string[];
  userContext?: string;
}): string {
  const excludeBlock = buildExcludeBlock(params.excludeTitles, params.userContext);

  const description = EXERCISE_MODE_DESCRIPTIONS[params.area] ?? params.area;
  return `You are a thinking-skills tutor generating concrete practice topics.

Exercise mode: "${params.area}" - ${description}

${excludeBlock}
Return a JSON array of exactly 5 objects. Each object has:
- "title": a short, SPECIFIC, concrete practice topic (not a broad domain like "DevOps" - instead something like "Choosing between blue-green and canary deployments during a high-traffic migration"). 6-16 words.
- "blurb": one short sentence (under 20 words) on what makes this topic interesting to practice for this mode.

${TOPIC_SUGGESTIONS_FOOTER}`;
}
