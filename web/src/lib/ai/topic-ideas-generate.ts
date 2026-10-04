import { generateValidatedJson } from "@/lib/ai/generate-validated";
import { buildTopicIdeasPrompt, rawTopicIdeasSchema } from "@/lib/ai/prompts/topic-ideas";
import { topicIdeasResponseSchema } from "@/lib/ai/response-schemas";
import {
  keepValidIdeas,
  minModes,
  modeCount,
  TOPIC_IDEA_COUNT,
  withCalibrationSlot,
  type TopicIdea,
  type TopicIdeaRequest,
} from "@/lib/topics/topic-ideas";

/** Ask a few more than needed: some ideas fail the code checks. */
const ASK = TOPIC_IDEA_COUNT + 4;

function parseRaw(text: string) {
  try {
    const r = rawTopicIdeasSchema.safeParse(JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")));
    return r.success ? ({ success: true, data: r.data } as const) : ({ success: false, error: r.error.message } as const);
  } catch {
    return { success: false, error: "Invalid JSON from model" } as const;
  }
}

/**
 * Ten topic ideas for a valid request (PLAN-topic-ideas.md T1): the AI suggests, the code
 * keeps only ideas that follow the rules, asks once more to fill gaps, and may add one
 * Calibration row from the bank. Null when fewer than 5 usable ideas came back.
 */
export async function generateTopicIdeas(request: TopicIdeaRequest, languageAppendix?: string): Promise<TopicIdea[] | null> {
  const ask = async (excludeMore: string[], count: number) => {
    const r = await generateValidatedJson({
      prompt: [buildTopicIdeasPrompt({ ...request, exclude: [...request.exclude, ...excludeMore] }, count), languageAppendix]
        .filter(Boolean)
        .join("\n\n"),
      parse: parseRaw,
      validate: (d) => (d.ideas.length >= Math.min(count, 6) ? [] : [`Return ${count} ideas.`]),
      responseJsonSchema: topicIdeasResponseSchema(),
      model: "fast",
      timeoutMs: 25_000,
    });
    return r.ok ? r.data.ideas : [];
  };
  let ideas: TopicIdea[] = keepValidIdeas(await ask([], ASK), request);
  if (ideas.length < TOPIC_IDEA_COUNT || (request.mode === "all" && modeCount(ideas) < minModes(request))) {
    // One top-up call, avoiding what we already have.
    ideas = [...ideas, ...keepValidIdeas(await ask(ideas.map((i) => i.title), ASK), request, ideas)];
  }
  return ideas.length < 5 ? null : withCalibrationSlot(ideas, request);
}
