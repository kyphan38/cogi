import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";
import { generateTopicIdeas } from "@/lib/ai/topic-ideas-generate";
import { requestErrors, type TopicIdeaRequest } from "@/lib/topics/topic-ideas";

export const maxDuration = 60;

const bodySchema = z.object({
  mode: z.string(),
  groupId: z.string().optional(),
  domain: z.string().optional(),
  exclude: z.array(z.string()).max(150).default([]),
});

/**
 * POST { mode: "all" | mode, groupId?, domain?, exclude? } -> 10 concrete topics
 * (PLAN-topic-ideas.md T1). The AI suggests; the code keeps only ideas that follow the
 * rules, asks once more to fill the gaps, and may add one Calibration row from the bank.
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
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  const request = { ...parsed.data, groupId: parsed.data.groupId || undefined, domain: parsed.data.domain || undefined } as TopicIdeaRequest;
  const errors = requestErrors(request);
  if (errors.length) return NextResponse.json({ ok: false, error: errors.join("; ") }, { status: 400 });
  const language = buildLanguageLevelAppendix(resolveLanguageLevel(body as Record<string, unknown>));

  try {
    const ideas = await generateTopicIdeas(request, language);
    if (!ideas) {
      return NextResponse.json({ ok: false, error: "AI could not suggest enough topics. Please try again." }, { status: 422 });
    }
    return NextResponse.json({ ok: true, ideas });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
    return NextResponse.json(
      { ok: false, error: timeout ? "This took too long. Please try again." : e instanceof Error ? e.message : "Unknown error" },
      { status: timeout ? 504 : 500 },
    );
  }
}
