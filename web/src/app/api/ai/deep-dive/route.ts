import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";
import { generateValidatedJson, validatedJsonFailureResponse } from "@/lib/ai/generate-validated";
import { analyticalDeepDiveResponseSchema } from "@/lib/ai/response-schemas";
import {
  allTagNames,
  buildAnalyticalDeepDivePrompt,
  resolveDeepDiveRef,
} from "@/lib/ai/prompts/analytical-deep-dive";
import {
  DEEP_DIVE_RETRY_SUFFIX,
  parseAnalyticalDeepDiveJson,
  validateAnalyticalDeepDive,
} from "@/lib/ai/validators/deep-dive";
import { TAG_LABELS } from "@/lib/exercise/tag-labels";
import type { EmbeddedIssue, ValidPoint } from "@/lib/types/exercise";

export const maxDuration = 60;

const bodySchema = z.object({
  ref: z.string().regex(/^(issue|decoy)_[1-9]\d*$/),
  title: z.string().trim().min(1),
  domain: z.string().trim().min(1),
  passage: z.string().trim().min(1),
  embeddedIssues: z.array(
    z.object({
      type: z.string().refine((t) => t in TAG_LABELS, "unknown tag"),
      textSegment: z.string().min(1),
      explanation: z.string(),
    }).passthrough(),
  ),
  validPoints: z.array(z.object({ textSegment: z.string().min(1), explanation: z.string() })),
  why: z.string().optional(),
  subtypeName: z.string().optional(),
});

/** POST JSON: "Go deeper" on one Analytical answer-key item. The caller saves the result. */
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
  const b = parsed.data;
  const target = resolveDeepDiveRef(
    b.ref,
    b.embeddedIssues as unknown as EmbeddedIssue[],
    b.validPoints as ValidPoint[],
  );
  if (!target) {
    return NextResponse.json({ ok: false, error: `No answer-key item for ${b.ref}` }, { status: 400 });
  }

  const prompt = [
    buildAnalyticalDeepDivePrompt({
      title: b.title,
      domain: b.domain,
      passage: b.passage,
      target,
      why: b.why,
      subtypeName: b.subtypeName,
    }),
    buildLanguageLevelAppendix(resolveLanguageLevel(body as Record<string, unknown>)),
  ]
    .filter(Boolean)
    .join("\n\n");
  const blockedNames = [...allTagNames(), ...(b.subtypeName?.trim() ? [b.subtypeName] : [])];

  try {
    const result = await generateValidatedJson({
      prompt,
      parse: parseAnalyticalDeepDiveJson,
      validate: (d) => validateAnalyticalDeepDive(d, { kind: target.kind, blockedNames }),
      retrySuffix: DEEP_DIVE_RETRY_SUFFIX,
      responseJsonSchema: analyticalDeepDiveResponseSchema(),
      timeoutMs: 25_000,
    });
    if (!result.ok) return validatedJsonFailureResponse(result, "AI could not explain this one. Please try again.");
    return NextResponse.json({ ok: true, deepDive: result.data });
  } catch (e) {
    const timeout =
      e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: timeout ? "This took too long. Please try again." : message },
      { status: timeout ? 504 : 500 },
    );
  }
}
