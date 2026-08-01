import { NextResponse } from "next/server";
import { buildTopicSuggestionsPrompt } from "@/lib/ai/prompts/topic-suggestions";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";

export const maxDuration = 30;

const VALID_EXERCISE_AREAS = new Set(["analytical", "sequential", "systems", "evaluative", "generative"]);
const VALID_MATH_AREAS = new Set([
  "expected_value",
  "graph_theory",
  "game_theory",
  "probability_bayes",
  "causal_literacy",
  "exponential_power_law",
]);

export interface TopicSuggestion {
  title: string;
  blurb: string;
}

function normalizeKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Exported for unit testing - parses/validates the model's raw JSON output. */
export function parseTopicSuggestions(raw: string, excludeTitles: string[]): TopicSuggestion[] | null {
  const excludeKeys = new Set(excludeTitles.map(normalizeKey));
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const result: TopicSuggestion[] = [];
    const seenKeys = new Set<string>();
    for (const item of arr) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as Record<string, unknown>).title !== "string" ||
        typeof (item as Record<string, unknown>).blurb !== "string"
      )
        continue;
      const title = ((item as Record<string, unknown>).title as string).trim();
      const blurb = ((item as Record<string, unknown>).blurb as string).trim();
      if (!title || !blurb) continue;
      const key = normalizeKey(title);
      if (excludeKeys.has(key) || seenKeys.has(key)) continue;
      seenKeys.add(key);
      result.push({ title, blurb });
      if (result.length >= 5) break;
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
  const kind = b.kind === "math" ? "math" : b.kind === "exercise" ? "exercise" : null;
  const area = typeof b.area === "string" ? b.area : "";
  const excludeTitles = Array.isArray(b.excludeTitles)
    ? b.excludeTitles.filter((t): t is string => typeof t === "string")
    : [];
  const userContext = typeof b.userContext === "string" ? b.userContext : undefined;

  if (!kind) {
    return NextResponse.json({ ok: false, error: "kind must be 'exercise' or 'math'" }, { status: 400 });
  }
  const validAreas = kind === "exercise" ? VALID_EXERCISE_AREAS : VALID_MATH_AREAS;
  if (!validAreas.has(area)) {
    return NextResponse.json({ ok: false, error: `Unknown area "${area}" for kind "${kind}"` }, { status: 400 });
  }

  const prompt = buildTopicSuggestionsPrompt({ area, kind, excludeTitles, userContext });
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
