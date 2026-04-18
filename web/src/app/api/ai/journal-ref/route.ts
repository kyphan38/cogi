import { NextResponse } from "next/server";
import { z } from "zod";
import { buildJournalReferencePrompt } from "@/lib/ai/prompts/journal-ref";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { getFirebaseAdminFirestore, getUserDocPath } from "@/lib/firebaseAdminFirestore";

export const maxDuration = 60;

const bodySchema = z.object({
  requestId: z.string().uuid(),
  domain: z.string().trim().min(1),
  snippets: z.array(z.string()).max(3).optional(),
});

/** Optional one-liner before journal prompts (Phase 1.5). Idempotent via aiArtifacts/{requestId}. */
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

  const { requestId, domain } = parsed.data;
  const snippets = (parsed.data.snippets ?? [])
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 3);

  if (snippets.length === 0) {
    return NextResponse.json({ ok: true, line: null });
  }

  const docPath = getUserDocPath(auth.user.uid, "aiArtifacts", requestId);
  const docRef = getFirebaseAdminFirestore().doc(docPath);
  const existing = await docRef.get();
  if (existing.exists) {
    const saved = existing.data() as { route?: string; line?: string | null; createdAt?: string };
    if (saved.route === "journal-ref" && Object.prototype.hasOwnProperty.call(saved, "line")) {
      return NextResponse.json({
        ok: true,
        line: saved.line ?? null,
        saved: {
          saved: true as const,
          id: requestId,
          path: docPath,
          savedAt: saved.createdAt ?? new Date().toISOString(),
        },
      });
    }
  }

  const prompt = buildJournalReferencePrompt({ domain, snippets });
  try {
    const raw = (await generatePlainTextRaw(prompt)).trim();
    const line =
      !raw || raw === "SKIP" || raw.toUpperCase() === "SKIP" ? null : raw.slice(0, 280);
    const createdAt = new Date().toISOString();
    await docRef.set({
      id: requestId,
      route: "journal-ref",
      domain,
      snippets,
      line,
      createdAt,
    });
    return NextResponse.json({
      ok: true,
      line,
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
