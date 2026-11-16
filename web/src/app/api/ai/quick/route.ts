import { NextResponse } from "next/server";
import { z } from "zod";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";
import { generateJsonFromAudio } from "@/lib/ai/gemini";
import { generateValidatedJson, validatedJsonFailureResponse } from "@/lib/ai/generate-validated";
import { buildQuickFeedbackPrompt, buildQuickQuestionPrompt, buildQuickSpokenFeedbackPrompt } from "@/lib/ai/prompts/quick";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import {
  QUICK_ANSWER_MAX,
  QUICK_AUDIO_MAX_BASE64,
  QUICK_AUDIO_MIMES,
  QUICK_SKILLS,
  parseQuickJson,
  quickEnglishErrors,
  quickFeedbackSchema,
  quickQuestionSchema,
  quickSpokenFeedbackSchema,
} from "@/lib/quick/schema";

export const maxDuration = 60;

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("question"),
    skill: z.enum(QUICK_SKILLS),
    userContext: z.string().max(4000).optional(),
    avoid: z.array(z.string().max(120)).max(20).optional(),
  }),
  z.object({
    action: z.literal("feedback"),
    scenario: z.string().min(1).max(1000),
    question: z.string().min(1).max(400),
    answer: z.string().min(1).max(QUICK_ANSWER_MAX),
  }),
  z.object({
    action: z.literal("spoken"),
    scenario: z.string().min(1).max(1000),
    question: z.string().min(1).max(400),
    audio: z.string().min(1).max(QUICK_AUDIO_MAX_BASE64),
    mimeType: z.enum(QUICK_AUDIO_MIMES),
  }),
]);

const jsonSchema = (schema: z.ZodType) => {
  const json = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
};

/** POST JSON: the 5-minute question. One action per call: a question, or feedback on a typed or spoken answer. */
export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req);
  if (!auth.ok) return auth.response;

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ ok: false, error: "Server is missing GEMINI_API_KEY" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const appendix = buildLanguageLevelAppendix(resolveLanguageLevel(body as Record<string, unknown>));

  try {
    if (input.action === "question") {
      const out = await generateValidatedJson({
        prompt: buildQuickQuestionPrompt({ skill: input.skill, userContext: input.userContext, avoid: input.avoid ?? [], appendix }),
        parse: (raw) => parseQuickJson(quickQuestionSchema, raw),
        validate: (d) => quickEnglishErrors(d),
        responseJsonSchema: jsonSchema(quickQuestionSchema),
        model: "fast",
        timeoutMs: 25_000,
      });
      if (!out.ok) return validatedJsonFailureResponse(out, "AI could not write a question. Please try again.");
      return NextResponse.json({ ok: true, question: out.data });
    }

    if (input.action === "feedback") {
      const out = await generateValidatedJson({
        prompt: buildQuickFeedbackPrompt({ scenario: input.scenario, question: input.question, answer: input.answer, appendix }),
        parse: (raw) => parseQuickJson(quickFeedbackSchema, raw),
        validate: (d) => quickEnglishErrors(d),
        responseJsonSchema: jsonSchema(quickFeedbackSchema),
        model: "fast",
        timeoutMs: 25_000,
      });
      if (!out.ok) return validatedJsonFailureResponse(out, "AI could not give feedback. Please try again.");
      return NextResponse.json({ ok: true, feedback: out.data });
    }

    // Spoken: one call transcribes and judges. The audio is not stored anywhere.
    const raw = await generateJsonFromAudio(
      buildQuickSpokenFeedbackPrompt({ scenario: input.scenario, question: input.question, appendix }),
      { data: input.audio, mimeType: input.mimeType },
      "fast",
      40_000,
      jsonSchema(quickSpokenFeedbackSchema),
    );
    const spoken = parseQuickJson(quickSpokenFeedbackSchema, raw);
    if (!spoken.success) {
      return NextResponse.json({ ok: false, error: "AI could not read the recording. Please try again." }, { status: 422 });
    }
    if (!spoken.data.transcript.trim()) {
      return NextResponse.json({ ok: false, error: "No speech was heard. Try again, or type your answer." }, { status: 422 });
    }
    const { transcript, delivery, ...feedback } = spoken.data;
    return NextResponse.json({ ok: true, transcript: transcript.trim(), feedback, delivery });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: timeout ? "This took too long. Please try again." : message },
      { status: timeout ? 504 : 500 },
    );
  }
}
