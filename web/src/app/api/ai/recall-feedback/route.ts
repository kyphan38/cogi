import { NextResponse } from "next/server";
import { z } from "zod";
import { buildRecallFeedbackPrompt } from "@/lib/ai/prompts/recall-feedback";
import { generatePlainTextRaw } from "@/lib/ai/gemini";

const bodySchema = z.object({
  exerciseTitle: z.string().min(1),
  summary: z.string(),
  userRecall: z.string().min(1).max(2000),
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

  const prompt = buildRecallFeedbackPrompt(parsed.data);
  try {
    const text = await generatePlainTextRaw(prompt);
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
