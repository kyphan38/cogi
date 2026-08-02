import { expectedValueScenarios } from "@/lib/scenarios/expected-value";
import { EXERCISE_MODE_DESCRIPTIONS } from "@/lib/ai/prompts/exercise-mode-catalog";

const MATH_TOPIC_DESCRIPTIONS: Record<string, string> = {
  expected_value: "weighing probability-weighted costs and payoffs to make a rational choice",
  graph_theory: "reasoning about networks, dependencies, shortest paths, and connectivity structures",
  game_theory: "reasoning about strategic interactions where other people's choices affect the best move",
  probability_bayes:
    "updating beliefs correctly as new evidence arrives, avoiding base-rate and conditional-probability traps",
  causal_literacy: "distinguishing correlation from causation, confounders, and reverse causality",
  exponential_power_law:
    "reasoning about compounding growth, thresholds, and power-law / long-tail distributions",
};

/** "Already practiced" exclusion block + optional user-context block - shared by both branches below. */
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
  kind: "exercise" | "math";
  excludeTitles: string[];
  userContext?: string;
}): string {
  const excludeBlock = buildExcludeBlock(params.excludeTitles, params.userContext);

  if (params.kind === "exercise") {
    const description = EXERCISE_MODE_DESCRIPTIONS[params.area] ?? params.area;
    return `You are a thinking-skills tutor generating concrete practice topics.

Exercise mode: "${params.area}" - ${description}

${excludeBlock}
Return a JSON array of exactly 5 objects. Each object has:
- "title": a short, SPECIFIC, concrete practice topic (not a broad domain like "DevOps" - instead something like "Choosing between blue-green and canary deployments during a high-traffic migration"). 6-16 words.
- "blurb": one short sentence (under 20 words) on what makes this topic interesting to practice for this mode.

${TOPIC_SUGGESTIONS_FOOTER}`;
  }

  const description = MATH_TOPIC_DESCRIPTIONS[params.area] ?? params.area;
  const exampleTitles = expectedValueScenarios.slice(0, 2).map((s) => s.title);
  return `You are designing applied-reasoning practice scenarios for a math/decision-theory training module.

Topic area: "${params.area}" - ${description}

Existing scenario titles for calibration on tone/specificity (do not copy):
${exampleTitles.map((t) => `- ${t}`).join("\n")}

${excludeBlock}
Return a JSON array of exactly 5 objects. Each object has:
- "title": a short, SPECIFIC, concrete scenario premise (a real-world decision or situation, like the calibration examples above). 6-16 words.
- "blurb": one short sentence (under 20 words) on the reasoning trap or tool this scenario would teach.

${TOPIC_SUGGESTIONS_FOOTER}`;
}
