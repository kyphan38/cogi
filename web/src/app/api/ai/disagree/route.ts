import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPerspectiveDisagreePrompt } from "@/lib/ai/prompts/disagree";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { getFirebaseAdminFirestore, getUserDocPath } from "@/lib/firebaseAdminFirestore";
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
  section: z.enum(["embedded", "userFound", "additional", "openQuestions"]),
  exerciseTitle: z.string().trim().min(1),
  domain: z.string().trim().optional().default(""),
  pointId: z.string().trim().min(1),
  pointTitle: z.string().trim().nullable().optional(),
  pointBody: z.string().trim().min(1),
  userReason: z.string().trim().min(15),
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
      { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedRouteUser(req);
  if (!auth.ok) return auth.response;

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

  const prompt = buildPerspectiveDisagreePrompt({
    kind: kind as PerspectiveKind,
    exerciseTitle,
    domain: domain || undefined,
    section: section as PerspectiveSectionKey,
    pointTitle,
    pointBody,
    userReason,
  });

  try {
    const text = await generatePlainTextRaw(prompt);
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
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
