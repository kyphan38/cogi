import { NextResponse } from "next/server";
import { buildRecommendModePrompt } from "@/lib/ai/prompts/recommend-mode";
import { EXERCISE_MODE_DESCRIPTIONS } from "@/lib/ai/prompts/exercise-mode-catalog";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";

export const maxDuration = 30;

const VALID_MODES = new Set(Object.keys(EXERCISE_MODE_DESCRIPTIONS));

type Recommendation = { mode: string; reason: string };

function parseRecommendations(raw: string): Recommendation[] | null {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const result: Recommendation[] = [];
    for (const item of arr) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as Record<string, unknown>).mode !== "string" ||
        typeof (item as Record<string, unknown>).reason !== "string"
      )
        continue;
      const mode = (item as Record<string, unknown>).mode as string;
      if (!VALID_MODES.has(mode)) continue;
      if (result.some((r) => r.mode === mode)) continue;
      result.push({ mode, reason: (item as Record<string, unknown>).reason as string });
    }
    return result.length > 0 ? result : null;
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
  const topic = typeof b.topic === "string" ? b.topic.trim() : "";
  if (!topic) {
    return NextResponse.json(
      { ok: false, error: "topic is required" },
      { status: 400 },
    );
  }

  const prompt = buildRecommendModePrompt(topic);
  try {
    const raw = await generateAnalyticalExerciseRaw(prompt);
    const recommendations = parseRecommendations(raw);
    if (!recommendations) {
      return NextResponse.json(
        { ok: false, error: "Model did not return valid recommendations" },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true, recommendations });
  } catch (e) {
    const isTimeout =
      e instanceof Error &&
      (e.name === "AbortError" || e.message.includes("timed out") || e.message.includes("timeout"));
    if (isTimeout) {
      return NextResponse.json(
        { ok: false, error: "Exercise generation timed out. Please try again." },
        { status: 504 },
      );
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
