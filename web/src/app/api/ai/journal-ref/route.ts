import { NextResponse } from "next/server";
import { buildJournalReferencePrompt } from "@/lib/ai/prompts/journal-ref";
import { generatePlainTextRaw } from "@/lib/ai/gemini";

/** Optional one-liner before journal prompts (Phase 1.5). */
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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Body must be object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const domain = typeof b.domain === "string" ? b.domain.trim() : "";
  if (!domain) {
    return NextResponse.json({ ok: false, error: "domain required" }, { status: 400 });
  }
  const snippets = Array.isArray(b.snippets)
    ? (b.snippets as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 3)
    : [];

  if (snippets.length === 0) {
    return NextResponse.json({ ok: true, line: null });
  }

  const prompt = buildJournalReferencePrompt({ domain, snippets });
  try {
    const raw = (await generatePlainTextRaw(prompt)).trim();
    if (!raw || raw === "SKIP" || raw.toUpperCase() === "SKIP") {
      return NextResponse.json({ ok: true, line: null });
    }
    const line = raw.slice(0, 280);
    return NextResponse.json({ ok: true, line });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
