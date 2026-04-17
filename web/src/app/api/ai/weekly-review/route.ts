import { NextResponse } from "next/server";
import { z } from "zod";
import { buildWeeklyReviewPrompt } from "@/lib/ai/prompts/weekly-review";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { getFirebaseAdminFirestore, getUserDocPath } from "@/lib/firebaseAdminFirestore";
import type { WeeklyReviewRow } from "@/lib/types/insights";

const exerciseSliceSchema = z.object({
  type: z.string(),
  domain: z.string(),
  title: z.string(),
  completedAt: z.string(),
  summary: z.string(),
  aiPerspectiveSnippet: z.string(),
  journalBlob: z.string(),
});

const decisionSliceSchema = z.object({
  text: z.string(),
  domain: z.string(),
  followUpNoteFilled: z.boolean(),
});

const actionSliceSchema = z.object({
  exerciseTitle: z.string(),
  oneAction: z.string(),
  createdAt: z.string(),
});

const bodySchema = z.object({
  requestId: z.string().uuid(),
  exercises: z.array(exerciseSliceSchema).length(7),
  decisions: z.array(decisionSliceSchema).max(5),
  actions: z.array(actionSliceSchema).max(40),
  emotionHistogram: z.record(z.string(), z.number()).default({}),
  perspectiveDisagreementCount: z.number().int().min(0).default(0),
  triggeredAtCompletedExerciseCount: z.number().int().min(0),
});

export async function POST(req: Request) {
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

  const auth = await requireAuthenticatedRouteUser(req);
  if (!auth.ok) return auth.response;

  const { requestId, triggeredAtCompletedExerciseCount, ...promptPayload } = parsed.data;
  const docPath = getUserDocPath(auth.user.uid, "weeklyReviews", requestId);
  const docRef = getFirebaseAdminFirestore().doc(docPath);
  const existing = await docRef.get();
  if (existing.exists) {
    const saved = existing.data() as WeeklyReviewRow;
    return NextResponse.json({
      ok: true,
      markdown: saved.markdown,
      saved: {
        saved: true as const,
        id: saved.id,
        path: docPath,
        savedAt: saved.createdAt,
      },
    });
  }

  const prompt = buildWeeklyReviewPrompt(promptPayload);
  try {
    const markdown = await generatePlainTextRaw(prompt);
    const row: WeeklyReviewRow = {
      id: requestId,
      createdAt: new Date().toISOString(),
      triggeredAtCompletedExerciseCount,
      markdown,
    };
    await docRef.set(row);
    return NextResponse.json({
      ok: true,
      markdown,
      saved: {
        saved: true as const,
        id: row.id,
        path: docPath,
        savedAt: row.createdAt,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
