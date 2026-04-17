import { NextResponse } from "next/server";
import { z } from "zod";
import { buildWeeklyReviewPrompt } from "@/lib/ai/prompts/weekly-review";
import { generatePlainTextRaw } from "@/lib/ai/gemini";

const exerciseSliceSchema = z.object({
  type: z.string(),
  domain: z.string(),
  title: z.string(),
  completedAt: z.string(),
  summary: z.string(),
  aiPerspectiveSnippet: z.string(),
  journalBlob: z.string(),
});

const decisionSliceSchema = z.object({
  text: z.string(),
  domain: z.string(),
  followUpNoteFilled: z.boolean(),
});

const actionSliceSchema = z.object({
  exerciseTitle: z.string(),
  oneAction: z.string(),
  createdAt: z.string(),
});

const bodySchema = z.object({
  exercises: z.array(exerciseSliceSchema).length(7),
  decisions: z.array(decisionSliceSchema).max(5),
  actions: z.array(actionSliceSchema).max(40),
  emotionHistogram: z.record(z.string(), z.number()).default({}),
  perspectiveDisagreementCount: z.number().int().min(0).default(0),
});

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const prompt = buildWeeklyReviewPrompt(parsed.data);
  try {
    const markdown = await generatePlainTextRaw(prompt);
    return NextResponse.json({ ok: true, markdown });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
