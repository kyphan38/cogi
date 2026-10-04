import { NextResponse } from "next/server";
import { buildDomainSuggestionsPrompt, DOMAIN_SUGGESTION_COUNT } from "@/lib/ai/prompts/domain-suggestions";
import { parseDomainSuggestions } from "@/lib/ai/domain-suggestions-parse";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";
import { PRACTICE_EXERCISE_TYPES } from "@/lib/exercise/exercise-mode-cards";
import type { ThinkingType } from "@/lib/types/exercise";

export const maxDuration = 30;

const strings = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : [];

/** POST { mode, exclude?, recentDomains?, userContext? } -> domain + sub-domain ideas for that mode. */
export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req);
  if (!auth.ok) return auth.response;
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ ok: false, error: "Server is missing GEMINI_API_KEY" }, { status: 500 });
  }
  let b: Record<string, unknown>;
  try {
    const body = (await req.json()) as unknown;
    if (typeof body !== "object" || body === null) throw new Error();
    b = body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be a JSON object" }, { status: 400 });
  }
  const mode = typeof b.mode === "string" ? b.mode : "";
  if (!(PRACTICE_EXERCISE_TYPES as readonly string[]).includes(mode)) {
    return NextResponse.json({ ok: false, error: `Unknown mode "${mode}"` }, { status: 400 });
  }
  const exclude = strings(b.exclude, 60);
  const prompt = [
    buildDomainSuggestionsPrompt({
      mode: mode as ThinkingType,
      exclude,
      recentDomains: strings(b.recentDomains, 20),
      userContext: typeof b.userContext === "string" ? b.userContext : undefined,
    }),
    buildLanguageLevelAppendix(resolveLanguageLevel(b)),
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    const suggestions = parseDomainSuggestions(await generateAnalyticalExerciseRaw(prompt, "fast"), exclude, DOMAIN_SUGGESTION_COUNT);
    if (!suggestions) {
      return NextResponse.json({ ok: false, error: "Model did not return valid suggestions" }, { status: 422 });
    }
    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
    return NextResponse.json(
      { ok: false, error: timeout ? "Suggestions timed out. Please try again." : e instanceof Error ? e.message : "Unknown error" },
      { status: timeout ? 504 : 500 },
    );
  }
}
