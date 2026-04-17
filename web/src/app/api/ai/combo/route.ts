import { NextResponse } from "next/server";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import { buildComboGenerationPrompt } from "@/lib/ai/prompts/combo";
import { parseComboBundleJson } from "@/lib/ai/validators/combo-bundle";
import {
  validateSystemsExerciseSemantics,
} from "@/lib/ai/validators/systems";
import { validateEvaluativeSemantics } from "@/lib/ai/validators/evaluative";
import type { ComboPresetId } from "@/lib/types/exercise";

const PRESETS: ComboPresetId[] = ["full_analysis", "decision_sprint", "root_cause"];

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
  const preset = b.preset as ComboPresetId | undefined;
  if (!preset || !PRESETS.includes(preset)) {
    return NextResponse.json({ ok: false, error: "preset must be a valid combo id" }, { status: 400 });
  }
  const domain = typeof b.domain === "string" ? b.domain.trim() : "";
  if (!domain) {
    return NextResponse.json({ ok: false, error: "domain is required" }, { status: 400 });
  }
  const userContext =
    typeof b.userContext === "string" && b.userContext.trim()
      ? b.userContext.trim()
      : undefined;

  const prompt = buildComboGenerationPrompt({ preset, domain, userContext });

  try {
    const raw = await generateAnalyticalExerciseRaw(prompt);
    const parsed = parseComboBundleJson(raw, preset);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
    }
    const data = parsed.data;
    if (data.preset === "full_analysis") {
      const sysErr = validateSystemsExerciseSemantics(data.systems);
      if (sysErr.length) {
        return NextResponse.json({ ok: false, error: sysErr.join("; ") }, { status: 422 });
      }
      const evErr = validateEvaluativeSemantics(data.evaluativeMatrix);
      if (evErr.length) {
        return NextResponse.json({ ok: false, error: evErr.join("; ") }, { status: 422 });
      }
    } else if (data.preset === "decision_sprint") {
      const evErr = validateEvaluativeSemantics(data.evaluativeMatrix);
      if (evErr.length) {
        return NextResponse.json({ ok: false, error: evErr.join("; ") }, { status: 422 });
      }
    } else {
      const sysErr = validateSystemsExerciseSemantics(data.systems);
      if (sysErr.length) {
        return NextResponse.json({ ok: false, error: sysErr.join("; ") }, { status: 422 });
      }
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
