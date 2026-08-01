import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAnalyticalExerciseRaw, generatePlainTextRaw } from "@/lib/ai/gemini";
import { buildStudentPrompt, buildTutorPrompt } from "@/lib/ai/prompts/math-scenario";
import { buildLiveScenarioDraftPrompt } from "@/lib/ai/prompts/math-scenario-live";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { scenarioObjectSchema } from "@/lib/scenarios/scenario-schema";
import { auditScenarioDraft } from "@/lib/scenarios/audit-draft";
import { allScenarios } from "@/lib/scenarios";
import type { Scenario } from "@/lib/types/math-scenario";

const tutorSchema = z.object({
  role: z.literal("tutor"),
  scenarioId: z.string().min(1),
  situation: z.string().min(1),
  userCurrentThinking: z.string().min(1),
  keyTraps: z.array(z.string()).default([]),
  hintLadder: z.array(z.string()).default([]),
  conversationHistory: z
    .array(
      z.object({
        sender: z.enum(["user", "tutor"]),
        message: z.string(),
      }),
    )
    .default([]),
});

const studentSchema = z.object({
  role: z.literal("student"),
  scenarioId: z.string().min(1),
  situation: z.string().min(1),
  toolName: z.string().min(1),
  fieldNote: z.string().min(1),
  userExplanation: z.string().min(1),
  conversationHistory: z
    .array(
      z.object({
        sender: z.enum(["user", "student"]),
        message: z.string(),
      }),
    )
    .default([]),
});

const topicSchema = z.enum([
  "expected_value",
  "graph_theory",
  "game_theory",
  "probability_bayes",
  "causal_literacy",
  "exponential_power_law",
]);

const generateScenarioSchema = z.object({
  role: z.literal("generate_scenario"),
  topic: topicSchema,
  title: z.string().min(1),
});

const requestSchema = z.discriminatedUnion("role", [tutorSchema, studentSchema, generateScenarioSchema]);

export const maxDuration = 60;

/** Injects server-known fields and validates the model's JSON against scenarioObjectSchema. */
export function parseLiveScenarioDraft(
  raw: string,
  topic: z.infer<typeof topicSchema>,
  title: string,
): { scenario: Scenario; issues: null } | { scenario: null; issues: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { scenario: null, issues: "Response was not valid JSON." };
  }
  const withServerFields = {
    ...(typeof json === "object" && json !== null ? json : {}),
    id: `draft-${crypto.randomUUID()}`,
    topic,
    title,
  };
  const parsed = scenarioObjectSchema.safeParse(withServerFields);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { scenario: null, issues };
  }
  return { scenario: parsed.data as Scenario, issues: null };
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Server is missing GEMINI_API_KEY" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.role === "generate_scenario") {
    // Only this branch requires auth - tutor/student are called without a bearer token by
    // existing clients (StepStruggle/StepTeachBack/sandbox), so gating the whole route would
    // break them. This is the only path that generates real content server-side, so it's the
    // one that needs it.
    const auth = await requireAuthenticatedRouteUser(req);
    if (!auth.ok) return auth.response;

    const prompt = buildLiveScenarioDraftPrompt({ topic: data.topic, title: data.title });
    try {
      let raw = await generateAnalyticalExerciseRaw(prompt, "thinking");
      let result = parseLiveScenarioDraft(raw, data.topic, data.title);
      let audit = result.scenario ? auditScenarioDraft(result.scenario, allScenarios) : null;

      if (!result.scenario || !audit?.pass) {
        const reason = result.issues ?? `Failed quality checks: ${audit?.failures.join("; ")}`;
        const retryPrompt = `${prompt}\n\nYour previous attempt was rejected for this reason - fix it and try again:\n${reason}`;
        raw = await generateAnalyticalExerciseRaw(retryPrompt, "thinking");
        result = parseLiveScenarioDraft(raw, data.topic, data.title);
        audit = result.scenario ? auditScenarioDraft(result.scenario, allScenarios) : null;
      }

      if (!result.scenario || !audit?.pass) {
        return NextResponse.json(
          {
            ok: false,
            error: "AI could not generate a valid scenario for this topic. Try another suggestion or Retry.",
          },
          { status: 422 },
        );
      }

      return NextResponse.json({ ok: true, scenario: result.scenario });
    } catch (e) {
      const isTimeout =
        e instanceof Error &&
        (e.name === "AbortError" || e.message.includes("timed out") || e.message.includes("timeout"));
      if (isTimeout) {
        return NextResponse.json(
          { ok: false, error: "Scenario generation timed out. Please try again." },
          { status: 504 },
        );
      }
      const message = e instanceof Error ? e.message : "Unknown AI error";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  let prompt: string;

  if (data.role === "tutor") {
    prompt = buildTutorPrompt({
      scenarioId: data.scenarioId,
      situation: data.situation,
      userCurrentThinking: data.userCurrentThinking,
      keyTraps: data.keyTraps,
      hintLadder: data.hintLadder,
      conversationHistory: data.conversationHistory,
    });
  } else {
    prompt = buildStudentPrompt({
      scenarioId: data.scenarioId,
      situation: data.situation,
      toolName: data.toolName,
      fieldNote: data.fieldNote,
      userExplanation: data.userExplanation,
      conversationHistory: data.conversationHistory,
    });
  }

  try {
    const text = await generatePlainTextRaw(prompt, "fast");
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown AI error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
