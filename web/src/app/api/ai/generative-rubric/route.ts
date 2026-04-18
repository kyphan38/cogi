import { NextResponse } from "next/server";
import { buildGenerativeRubricPrompt } from "@/lib/ai/prompts/generative-rubric";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import type { GenerativeExerciseRow } from "@/lib/types/exercise";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";

export const maxDuration = 60;

function parseRubric(raw: string): { overall: number } | null {
  try {
    const j = JSON.parse(raw) as { overall?: unknown };
    const overall = typeof j.overall === "number" ? j.overall : Number(j.overall);
    if (!Number.isFinite(overall)) return null;
    return { overall: Math.max(0, Math.min(100, Math.round(overall))) };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req);
  if (!auth.ok) return auth.response;

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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Body must be object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const exercise = b.exercise as GenerativeExerciseRow | undefined;
  if (!exercise || exercise.type !== "generative") {
    return NextResponse.json(
      { ok: false, error: "exercise must be a GenerativeExerciseRow" },
      { status: 400 },
    );
  }

  const prompt = buildGenerativeRubricPrompt(exercise);
  try {
    const raw = await generateAnalyticalExerciseRaw(prompt);
    const parsed = parseRubric(raw);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "Model did not return valid rubric JSON" },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true, overall: parsed.overall });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
