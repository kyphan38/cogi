import { NextResponse } from "next/server";
import { z } from "zod";
import { buildRecallFeedbackPrompt } from "@/lib/ai/prompts/recall-feedback";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { getFirebaseAdminFirestore, getUserDocPath } from "@/lib/firebaseAdminFirestore";

const bodySchema = z.object({
  requestId: z.string().uuid(),
  exerciseId: z.string().trim().min(1),
  exerciseTitle: z.string().min(1),
  summary: z.string(),
  userRecall: z.string().min(1).max(2000),
});

export const maxDuration = 60;

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

  const { requestId, exerciseId, ...promptInput } = parsed.data;
  const docPath = getUserDocPath(auth.user.uid, "aiArtifacts", requestId);
  const docRef = getFirebaseAdminFirestore().doc(docPath);
  const existing = await docRef.get();
  if (existing.exists) {
    const saved = existing.data() as { feedbackText?: string; createdAt?: string };
    if (saved.feedbackText) {
      return NextResponse.json({
        ok: true,
        text: saved.feedbackText,
        saved: {
          saved: true as const,
          id: requestId,
          path: docPath,
          savedAt: saved.createdAt ?? new Date().toISOString(),
        },
      });
    }
  }

  const prompt = buildRecallFeedbackPrompt(promptInput);
  try {
    const text = await generatePlainTextRaw(prompt);
    const createdAt = new Date().toISOString();
    await docRef.set({
      id: requestId,
      route: "recall-feedback",
      exerciseId,
      exerciseTitle: promptInput.exerciseTitle,
      summary: promptInput.summary,
      userRecall: promptInput.userRecall,
      feedbackText: text,
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
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
