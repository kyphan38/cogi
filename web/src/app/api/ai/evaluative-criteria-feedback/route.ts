import { NextResponse } from "next/server";
import { z } from "zod";
import { buildEvaluativeCriteriaFeedbackPrompt } from "@/lib/ai/prompts/evaluative-criteria-feedback";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { getFirebaseAdminFirestore, getUserDocPath } from "@/lib/firebaseAdminFirestore";
import { buildLanguageLevelAppendix, resolveLanguageLevel } from "@/lib/adaptive/language-level";

export const maxDuration = 60;

const criterionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().trim().min(1),
  suggestedWeight: z.number(),
});

const axisSchema = z.object({
  label: z.string().trim().min(1),
  lowLabel: z.string().trim().min(1),
  highLabel: z.string().trim().min(1),
});

const proposedCriterionSchema = z.object({
  name: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
});

const bodySchema = z.discriminatedUnion("variant", [
  z.object({
    requestId: z.string().uuid(),
    variant: z.literal("matrix"),
    title: z.string().trim().min(1),
    domain: z.string().trim().min(1),
    scenario: z.string().trim().min(1),
    userProposedCriteria: z.array(proposedCriterionSchema).min(2),
    axisX: axisSchema,
    axisY: axisSchema,
  }),
  z.object({
    requestId: z.string().uuid(),
    variant: z.literal("scoring"),
    title: z.string().trim().min(1),
    domain: z.string().trim().min(1),
    scenario: z.string().trim().min(1),
    userProposedCriteria: z.array(proposedCriterionSchema).min(2),
    criteria: z.array(criterionSchema).min(1),
  }),
]);

/** Non-blocking AI critique of the user's self-proposed evaluation criteria. */
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const { requestId, variant, title, domain, scenario, userProposedCriteria } = parsed.data;

  const docPath = getUserDocPath(auth.user.uid, "aiArtifacts", requestId);
  const docRef = getFirebaseAdminFirestore().doc(docPath);
  const existing = await docRef.get();
  if (existing.exists) {
    const saved = existing.data() as { route?: string; text?: string; createdAt?: string };
    if (saved.route === "evaluative-criteria-feedback" && typeof saved.text === "string") {
      return NextResponse.json({
        ok: true,
        text: saved.text,
        saved: {
          saved: true as const,
          id: requestId,
          path: docPath,
          savedAt: saved.createdAt ?? new Date().toISOString(),
        },
      });
    }
  }

  const basePrompt = buildEvaluativeCriteriaFeedbackPrompt({
    title,
    domain,
    scenario,
    userProposedCriteria,
    aiFramework:
      variant === "matrix"
        ? { kind: "axes", axisX: parsed.data.axisX, axisY: parsed.data.axisY }
        : { kind: "criteria", criteria: parsed.data.criteria },
  });
  const languageAppendix = buildLanguageLevelAppendix(
    resolveLanguageLevel(body as Record<string, unknown>),
  );
  const prompt = [basePrompt, languageAppendix].filter(Boolean).join("\n\n");

  try {
    const text = (await generatePlainTextRaw(prompt)).trim();
    const createdAt = new Date().toISOString();
    await docRef.set({
      id: requestId,
      route: "evaluative-criteria-feedback",
      variant,
      domain,
      text,
      createdAt,
    });
    return NextResponse.json({
      ok: true,
      text,
      saved: {
        saved: true as const,
        id: requestId,
        path: docPath,
        savedAt: createdAt,
      },
    });
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
