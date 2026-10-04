import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";
import { generateValidatedJson, validatedJsonFailureResponse } from "@/lib/ai/generate-validated";
import { geoStraitResponseSchema } from "@/lib/ai/response-schemas";
import { buildGeoStraitPrompt, straitFactsText } from "@/lib/ai/prompts/geo-strait";
import {
  GEO_STRAIT_RETRY_SUFFIX,
  parseGeoStraitJson,
  validateGeoStraitExplanation,
} from "@/lib/ai/validators/geo-strait";
import { ALT_ROUTES, chokepointById, type RouteId } from "@/lib/geo/chokepoints";
import { scoreStrait } from "@/lib/geo/strait";

export const maxDuration = 60;

const bodySchema = z.object({
  chokepointId: z.string().min(1),
  picked: z.array(z.string().regex(/^\d{3}$/)).max(12),
  route: z.string().nullable(),
});

/**
 * POST JSON: a short note on one "Close the strait" guess. Only ids come from the
 * client; the facts and the score are rebuilt here from the fixed data set.
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
  const cp = chokepointById(parsed.data.chokepointId);
  if (!cp?.game) {
    return NextResponse.json({ ok: false, error: `Unknown strait: ${parsed.data.chokepointId}` }, { status: 400 });
  }
  const route = parsed.data.route && parsed.data.route in ALT_ROUTES ? (parsed.data.route as RouteId) : null;
  const result = scoreStrait(cp, parsed.data.picked, route);
  const facts = straitFactsText(cp);

  const prompt = [
    buildGeoStraitPrompt({ cp, result, route }),
    buildLanguageLevelAppendix(resolveLanguageLevel(body as Record<string, unknown>)),
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const out = await generateValidatedJson({
      prompt,
      parse: parseGeoStraitJson,
      validate: (d) => validateGeoStraitExplanation(d, facts),
      retrySuffix: GEO_STRAIT_RETRY_SUFFIX,
      responseJsonSchema: geoStraitResponseSchema(),
      model: "fast",
      timeoutMs: 25_000,
    });
    if (!out.ok) return validatedJsonFailureResponse(out, "AI could not explain this one. Please try again.");
    return NextResponse.json({ ok: true, explanation: out.data });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: timeout ? "This took too long. Please try again." : message },
      { status: timeout ? 504 : 500 },
    );
  }
}
