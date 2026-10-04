import { z } from "zod";
import { EXERCISE_MODE_DESCRIPTIONS } from "@/lib/ai/prompts/exercise-mode-catalog";
import { GEO_FACT_RULE } from "@/lib/ai/prompts/geo-rules";
import { minModes, perModeCap, TOPIC_GROUPS, topicGroupById, type AiTopicMode, type TopicIdeaRequest } from "@/lib/topics/topic-ideas";

/** One idea as the AI returns it; the code checks every field afterwards. */
export const rawTopicIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      mode: z.string(),
      group: z.string(),
      domain: z.string(),
    }),
  ),
});

/** What makes a topic fit each mode, so the AI pairs topics and modes sensibly. */
const MODE_FIT: Record<AiTopicMode, string> = {
  analytical: "there is a claim or argument to read and question (an ad, a news story, a plan, a policy)",
  systems: "many parts affect each other over time (a city, a market, a team, a supply chain)",
  evaluative: "someone must choose between a few real options with trade-offs",
  judgment: "a real-life moment with other people at work, at home or with money",
  strategy: "two sides choose at the same time and each one's result depends on the other",
  reframe: "a hard personal moment with strong feelings and unhelpful thoughts",
};

/**
 * Ten concrete topics for the "A topic" / "A mode" lists (PLAN-topic-ideas.md T1). The
 * prompt narrows the AI to the chosen filters; `keepValidIdeas` enforces them in code.
 */
export function buildTopicIdeasPrompt(req: TopicIdeaRequest, count: number): string {
  const group = topicGroupById(req.groupId);
  const groups = group
    ? [group]
    : TOPIC_GROUPS.filter((g) => req.mode === "all" || g.modes.includes(req.mode));
  const groupLines = groups
    .map((g) => {
      const modes = req.mode === "all" ? g.modes : g.modes.filter((m) => m === req.mode);
      return `- id "${g.id}" (${g.label}); modes: ${modes.join(", ")}; domains: ${(req.domain ? [req.domain] : g.domains.slice(0, 6)).join("; ")}`;
    })
    .join("\n");
  const modes = req.mode === "all" ? (group ? group.modes : undefined) : [req.mode];
  const modeLines = (modes ?? (Object.keys(MODE_FIT) as AiTopicMode[]))
    .map((m) => `- ${m}: ${EXERCISE_MODE_DESCRIPTIONS[m]}. Good topics: ${MODE_FIT[m]}.`)
    .join("\n");
  const geo = groups.some((g) => g.id.startsWith("geo"));
  const spread =
    req.mode === "all"
      ? `- Use at least ${minModes(req)} different modes, and no mode more than ${perModeCap(req)} times.\n- Spread the topics over different groups and domains.`
      : `- Every topic is for the mode "${req.mode}".\n- Spread the topics over different domains.`;

  return `You suggest practice topics for a beginner who trains thinking skills.

MODES (pick for each topic the mode it fits best):
${modeLines}

GROUPS (use only these; each topic must use a mode listed for its group):
${groupLines}
${req.domain ? `\nEvery topic must be about this domain: ${req.domain}.\n` : ""}
Do not suggest these topics or close variants (already practised or on screen):
${req.exclude.length ? req.exclude.map((t) => `- ${t}`).join("\n") : "(none)"}

Return ONLY a JSON object: { "ideas": [ { "title": string, "mode": string, "group": string (a group id), "domain": string (one domain of that group) } ] } with exactly ${count} ideas.

Rules:
- "title" is one concrete situation in 6-14 plain words, e.g. "A manager criticises your report in front of the team" or "Two food delivery apps cut prices in the same week". Not a broad area.
- Real, everyday situations that many people meet. No niche jargon.
${spread}
- English only.${geo ? `\n${GEO_FACT_RULE}` : ""}`;
}
