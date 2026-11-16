import { NextResponse } from "next/server";
import { z } from "zod";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";
import { generateWithSearch } from "@/lib/ai/gemini";
import { generateValidatedJson, validatedJsonFailureResponse } from "@/lib/ai/generate-validated";
import { buildBriefResearchPrompt, buildBriefShapePrompt } from "@/lib/ai/prompts/brief";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { BRIEF_AREAS, briefContentSchema, briefErrors, parseBriefJson } from "@/lib/briefs/schema";

export const maxDuration = 60;

const bodySchema = z.object({
  area: z.enum(BRIEF_AREAS),
  /** The user's local day, so "the last 30 days" is theirs. */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  avoid: z.array(z.string().max(120)).max(30).optional(),
});

/** Links shown under a brief. More than this is noise. */
const MAX_SOURCES = 8;

/**
 * POST JSON: one brief on a big story of the last month. Two calls: a web search that
 * writes notes, then a plain call that shapes them and may not add facts.
 */
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
  const { area, today, avoid } = parsed.data;

  try {
    const research = await generateWithSearch(buildBriefResearchPrompt({ area, today, avoid: avoid ?? [] }), "fast", 30_000);
    if (research.sources.length === 0) {
      // No search result behind the notes: do not present it as news.
      return NextResponse.json({ ok: false, error: "The web search found nothing to cite. Please try again." }, { status: 502 });
    }
    const schema = z.toJSONSchema(briefContentSchema, { io: "input" }) as Record<string, unknown>;
    delete schema.$schema;
    const out = await generateValidatedJson({
      prompt: buildBriefShapePrompt({
        notes: research.text.slice(0, 12_000),
        appendix: buildLanguageLevelAppendix(resolveLanguageLevel(body as Record<string, unknown>)),
      }),
      parse: parseBriefJson,
      validate: briefErrors,
      responseJsonSchema: schema,
      model: "fast",
      timeoutMs: 22_000,
    });
    if (!out.ok) return validatedJsonFailureResponse(out, "AI could not write the brief. Please try again.");
    return NextResponse.json({ ok: true, brief: out.data, sources: research.sources.slice(0, MAX_SOURCES) });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: timeout ? "This took too long. Please try again." : message },
      { status: timeout ? 504 : 500 },
    );
  }
}
