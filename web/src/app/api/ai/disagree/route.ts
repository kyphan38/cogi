import { NextResponse } from "next/server";
import { buildPerspectiveDisagreePrompt } from "@/lib/ai/prompts/disagree";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import type { PerspectiveKind, PerspectiveSectionKey } from "@/lib/types/disagreement";

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

  const kind = b.kind as PerspectiveKind | undefined;
  const allowedKinds: PerspectiveKind[] = [
    "analytical",
    "sequential",
    "systems",
    "evaluative-matrix",
    "evaluative-scoring",
    "generative",
  ];
  if (!kind || !allowedKinds.includes(kind)) {
    return NextResponse.json({ ok: false, error: "kind is invalid" }, { status: 400 });
  }

  const section = b.section as PerspectiveSectionKey | undefined;
  const allowedSections: PerspectiveSectionKey[] = [
    "embedded",
    "userFound",
    "additional",
    "openQuestions",
  ];
  if (!section || !allowedSections.includes(section)) {
    return NextResponse.json({ ok: false, error: "section is invalid" }, { status: 400 });
  }

  const exerciseTitle = typeof b.exerciseTitle === "string" ? b.exerciseTitle.trim() : "";
  const domain = typeof b.domain === "string" ? b.domain.trim() : "";
  const pointId = typeof b.pointId === "string" ? b.pointId.trim() : "";
  const pointBody = typeof b.pointBody === "string" ? b.pointBody.trim() : "";
  const userReason = typeof b.userReason === "string" ? b.userReason.trim() : "";
  const pointTitle =
    typeof b.pointTitle === "string" && b.pointTitle.trim() ? b.pointTitle.trim() : null;

  if (!exerciseTitle || !pointId || !pointBody || !userReason) {
    return NextResponse.json(
      { ok: false, error: "exerciseTitle, pointId, pointBody, userReason are required" },
      { status: 400 },
    );
  }
  if (userReason.length < 15) {
    return NextResponse.json(
      { ok: false, error: "Please write at least 15 characters explaining your disagreement." },
      { status: 400 },
    );
  }

  const prompt = buildPerspectiveDisagreePrompt({
    kind,
    exerciseTitle,
    domain: domain || undefined,
    section,
    pointTitle,
    pointBody,
    userReason,
  });

  try {
    const text = await generatePlainTextRaw(prompt);
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
