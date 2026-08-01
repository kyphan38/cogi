import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { buildStudentPrompt, buildTutorPrompt } from "@/lib/ai/prompts/math-scenario";

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

const requestSchema = z.discriminatedUnion("role", [tutorSchema, studentSchema]);

export const maxDuration = 60;

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
