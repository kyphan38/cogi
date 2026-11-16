import { NextResponse } from "next/server";
import { z } from "zod";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";
import { generateValidatedJson, validatedJsonFailureResponse } from "@/lib/ai/generate-validated";
import { buildMonthlyReviewPrompt } from "@/lib/ai/prompts/monthly-review";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { monthlyReviewErrors, monthlyReviewTextSchema, monthStatsSchema, parseMonthlyReviewJson } from "@/lib/monthly/schema";

export const maxDuration = 60;

const bodySchema = z.object({ stats: monthStatsSchema });

/** POST JSON: words for one month's numbers. The client counts the numbers from its own exercises. */
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
  const { stats } = parsed.data;
  const schema = z.toJSONSchema(monthlyReviewTextSchema, { io: "input" }) as Record<string, unknown>;
  delete schema.$schema;

  try {
    const out = await generateValidatedJson({
      prompt: buildMonthlyReviewPrompt(stats, buildLanguageLevelAppendix(resolveLanguageLevel(body as Record<string, unknown>))),
      parse: parseMonthlyReviewJson,
      validate: (d) => monthlyReviewErrors(d, stats),
      responseJsonSchema: schema,
      model: "thinking",
      timeoutMs: 40_000,
    });
    if (!out.ok) return validatedJsonFailureResponse(out, "AI could not write the review. Please try again.");
    return NextResponse.json({ ok: true, text: out.data });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: timeout ? "This took too long. Please try again." : message },
      { status: timeout ? 504 : 500 },
    );
  }
}
