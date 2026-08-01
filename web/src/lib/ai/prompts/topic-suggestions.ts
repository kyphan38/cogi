import { expectedValueScenarios } from "@/lib/scenarios/expected-value";

const EXERCISE_MODE_DESCRIPTIONS: Record<string, string> = {
  analytical: "spotting flawed reasoning, logical fallacies, and hidden assumptions in arguments",
  sequential: "ordering steps in a process, understanding dependencies and sequences",
  systems: "mapping feedback loops, cause-and-effect networks, and system dynamics",
  evaluative: "comparing options with weighted criteria, tradeoff analysis, and decision matrices",
  generative: "writing arguments or proposals, then stress-testing them via debate",
};

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

export function buildTopicSuggestionsPrompt(params: {
  area: string;
  kind: "exercise" | "math";
  excludeTitles: string[];
  userContext?: string;
}): string {
  const excludeList =
    params.excludeTitles.length > 0
      ? params.excludeTitles.map((t) => `- ${t}`).join("\n")
      : "(none yet)";

  if (params.kind === "exercise") {
    const description = EXERCISE_MODE_DESCRIPTIONS[params.area] ?? params.area;
    return `You are a thinking-skills tutor generating concrete practice topics.

Exercise mode: "${params.area}" - ${description}

[TOPICS ALREADY PRACTICED - DO NOT SUGGEST THESE OR CLOSE VARIANTS]
${excludeList}
${params.userContext ? `\n[USER CONTEXT]\n${params.userContext}\n` : ""}
Return a JSON array of exactly 5 objects. Each object has:
- "title": a short, SPECIFIC, concrete practice topic (not a broad domain like "DevOps" - instead something like "Choosing between blue-green and canary deployments during a high-traffic migration"). 6-16 words.
- "blurb": one short sentence (under 20 words) on what makes this topic interesting to practice for this mode.

Titles must be diverse from each other and from the already-practiced list above. Return ONLY the JSON array, no markdown fences, no prose.`;
  }

  const description = MATH_TOPIC_DESCRIPTIONS[params.area] ?? params.area;
  const exampleTitles = expectedValueScenarios.slice(0, 2).map((s) => s.title);
  return `You are designing applied-reasoning practice scenarios for a math/decision-theory training module.

Topic area: "${params.area}" - ${description}

Existing scenario titles for calibration on tone/specificity (do not copy):
${exampleTitles.map((t) => `- ${t}`).join("\n")}

[TOPICS ALREADY PRACTICED - DO NOT SUGGEST THESE OR CLOSE VARIANTS]
${excludeList}
${params.userContext ? `\n[USER CONTEXT]\n${params.userContext}\n` : ""}
Return a JSON array of exactly 5 objects. Each object has:
- "title": a short, SPECIFIC, concrete scenario premise (a real-world decision or situation, like the calibration examples above). 6-16 words.
- "blurb": one short sentence (under 20 words) on the reasoning trap or tool this scenario would teach.

Titles must be diverse from each other and from the already-practiced list above. Return ONLY the JSON array, no markdown fences, no prose.`;
}
