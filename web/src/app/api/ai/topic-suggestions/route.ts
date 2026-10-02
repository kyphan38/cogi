import { NextResponse } from "next/server";
import { buildTopicSuggestionsPrompt } from "@/lib/ai/prompts/topic-suggestions";
import { parseTopicSuggestions } from "@/lib/ai/topic-suggestions-parse";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";

export const maxDuration = 30;

const VALID_EXERCISE_AREAS = new Set(["analytical", "systems", "evaluative"]);

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
  const kind = b.kind === "exercise" ? "exercise" : null;
  const area = typeof b.area === "string" ? b.area : "";
  const excludeTitles = Array.isArray(b.excludeTitles)
    ? b.excludeTitles.filter((t): t is string => typeof t === "string")
    : [];
  const userContext = typeof b.userContext === "string" ? b.userContext : undefined;

  if (!kind) {
    return NextResponse.json({ ok: false, error: "kind must be 'exercise'" }, { status: 400 });
  }
  if (!VALID_EXERCISE_AREAS.has(area)) {
    return NextResponse.json({ ok: false, error: `Unknown area "${area}" for kind "${kind}"` }, { status: 400 });
  }

  const basePrompt = buildTopicSuggestionsPrompt({ area, kind, excludeTitles, userContext });
  const languageAppendix = buildLanguageLevelAppendix(resolveLanguageLevel(b));
  const prompt = [basePrompt, languageAppendix].filter(Boolean).join("\n\n");
  try {
    const raw = await generateAnalyticalExerciseRaw(prompt, "fast");
    const suggestions = parseTopicSuggestions(raw, excludeTitles);
    if (!suggestions) {
      return NextResponse.json(
        { ok: false, error: "Model did not return valid topic suggestions" },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    const isTimeout =
      e instanceof Error &&
      (e.name === "AbortError" || e.message.includes("timed out") || e.message.includes("timeout"));
    if (isTimeout) {
      return NextResponse.json(
        { ok: false, error: "Topic suggestion generation timed out. Please try again." },
        { status: 504 },
      );
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
