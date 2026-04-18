import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAnalyticalExerciseRaw } from "@/lib/ai/gemini";
import { buildComboGenerationPrompt } from "@/lib/ai/prompts/combo";
import { parseComboBundleJson, type ComboBundle } from "@/lib/ai/validators/combo-bundle";
import { validateSystemsExerciseSemantics } from "@/lib/ai/validators/systems";
import { validateEvaluativeSemantics } from "@/lib/ai/validators/evaluative";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";
import { getFirebaseAdminFirestore, getUserDocPath } from "@/lib/firebaseAdminFirestore";

export const maxDuration = 60;

const presetSchema = z.enum(["full_analysis", "decision_sprint", "root_cause"]);

const bodySchema = z.object({
  requestId: z.string().uuid(),
  preset: presetSchema,
  domain: z.string().trim().min(1),
  userContext: z.string().trim().optional(),
});

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

  const { requestId, preset, domain, userContext } = parsed.data;

  const docPath = getUserDocPath(auth.user.uid, "aiArtifacts", requestId);
  const docRef = getFirebaseAdminFirestore().doc(docPath);
  const existing = await docRef.get();
  if (existing.exists) {
    const saved = existing.data() as {
      route?: string;
      comboData?: ComboBundle;
      createdAt?: string;
    };
    if (saved.route === "combo" && saved.comboData != null) {
      return NextResponse.json({
        ok: true,
        data: saved.comboData,
        saved: {
          saved: true as const,
          id: requestId,
          path: docPath,
          savedAt: saved.createdAt ?? new Date().toISOString(),
        },
      });
    }
  }

  const prompt = buildComboGenerationPrompt({ preset, domain, userContext });

  try {
    const raw = await generateAnalyticalExerciseRaw(prompt);
    const bundleParsed = parseComboBundleJson(raw, preset);
    if (!bundleParsed.success) {
      return NextResponse.json({ ok: false, error: bundleParsed.error }, { status: 422 });
    }
    const data = bundleParsed.data;
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

    const createdAt = new Date().toISOString();
    await docRef.set({
      id: requestId,
      route: "combo",
      preset,
      domain,
      userContext: userContext ?? null,
      comboData: data,
      createdAt,
    });

    return NextResponse.json({
      ok: true,
      data,
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
