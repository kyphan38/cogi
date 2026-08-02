import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPerspectiveDisagreePrompt } from "@/lib/ai/prompts/disagree";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import {
  getFirebaseAdminFirestore,
  getUserCollectionPath,
  getUserDocPath,
} from "@/lib/firebaseAdminFirestore";
import type { PerspectiveDisagreementRow, PerspectiveKind, PerspectiveSectionKey } from "@/lib/types/disagreement";

const bodySchema = z.object({
  requestId: z.string().uuid(),
  exerciseId: z.string().trim().min(1),
  kind: z.enum([
    "analytical",
    "sequential",
    "systems",
    "evaluative-matrix",
    "evaluative-scoring",
    "generative",
  ]),
  section: z.enum([
    "embedded",
    "userFound",
    "additional",
    "openQuestions",
    "highlightCritiques",
    "nodeCritiques",
    "placementCritiques",
    "critiqueMatrix",
    "stepCritiques",
    "openQuestionsList",
  ]),
  exerciseTitle: z.string().trim().min(1),
  domain: z.string().trim().optional().default(""),
  pointId: z.string().trim().min(1),
  pointTitle: z.string().trim().nullable().optional(),
  pointBody: z.string().trim().min(1),
  userReason: z.string().trim().min(15),
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
      { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 },
    );
  }

  const {
    requestId,
    exerciseId,
    kind,
    section,
    exerciseTitle,
    domain,
    pointId,
    pointTitle,
    pointBody,
    userReason,
  } = parsed.data;
  const docPath = getUserDocPath(auth.user.uid, "perspectiveDisagreements", requestId);
  const docRef = getFirebaseAdminFirestore().doc(docPath);
  const existing = await docRef.get();
  if (existing.exists) {
    const saved = existing.data() as PerspectiveDisagreementRow;
    return NextResponse.json({
      ok: true,
      text: saved.aiReply,
      saved: {
        saved: true as const,
        id: saved.id,
        path: docPath,
        savedAt: saved.createdAt,
      },
    });
  }

  // Equality-only filter on exerciseId - no .orderBy() in the Firestore query itself, so this
  // needs no composite index. Sort/filter by section+pointId happens in JS below. If this is
  // ever "optimized" to add .orderBy("createdAt"), it will need a new composite index
  // (exerciseId ASC, createdAt ASC) or it will fail at runtime.
  const priorSnap = await getFirebaseAdminFirestore()
    .collection(getUserCollectionPath(auth.user.uid, "perspectiveDisagreements"))
    .where("exerciseId", "==", exerciseId)
    .get();
  const priorTurns = priorSnap.docs
    .map((d) => d.data() as PerspectiveDisagreementRow)
    .filter((r) => r.section === section && r.pointId === pointId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ userReason: r.userReason, aiReply: r.aiReply }));

  const prompt = buildPerspectiveDisagreePrompt({
    kind: kind as PerspectiveKind,
    exerciseTitle,
    domain: domain || undefined,
    section: section as PerspectiveSectionKey,
    pointTitle,
    pointBody,
    userReason,
    priorTurns,
  });

  try {
    const text = await generatePlainTextRaw(prompt, "thinking");
    const row: PerspectiveDisagreementRow = {
      id: requestId,
      exerciseId,
      kind: kind as PerspectiveKind,
      section: section as PerspectiveSectionKey,
      pointId,
      pointTitle: pointTitle?.trim() ? pointTitle.trim() : null,
      pointBody,
      userReason,
      aiReply: text,
      createdAt: new Date().toISOString(),
    };
    await docRef.set(row);
    return NextResponse.json({
      ok: true,
      text,
      saved: {
        saved: true as const,
        id: row.id,
        path: docPath,
        savedAt: row.createdAt,
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
