import { NextResponse } from "next/server";
import {
  buildGenerativeDebateContinuePrompt,
  buildGenerativeDebateStartPrompt,
  type DebateChatMessage,
} from "@/lib/ai/prompts/generative-debate";
import { generatePlainTextRaw } from "@/lib/ai/gemini";
import { requireAuthenticatedRouteUser } from "@/lib/auth/server-route-auth";

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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Body must be object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const mode = b.mode === "continue" ? "continue" : "start";

  const domain = typeof b.domain === "string" ? b.domain : "";
  const title = typeof b.title === "string" ? b.title : "";
  if (!domain.trim() || !title.trim()) {
    return NextResponse.json(
      { ok: false, error: "domain and title are required" },
      { status: 400 },
    );
  }

  try {
    if (mode === "start") {
      const scenario = typeof b.scenario === "string" ? b.scenario : "";
      const steelmanText = typeof b.steelmanText === "string" ? b.steelmanText : "";
      const qaRaw = b.qa;
      if (!Array.isArray(qaRaw)) {
        return NextResponse.json(
          { ok: false, error: "qa must be an array of { id, question, answer }" },
          { status: 400 },
        );
      }
      const qa: { id: string; question: string; answer: string }[] = [];
      for (const row of qaRaw) {
        if (typeof row !== "object" || row === null) continue;
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : "";
        const question = typeof r.question === "string" ? r.question : "";
        const answer = typeof r.answer === "string" ? r.answer : "";
        if (id && question) qa.push({ id, question, answer });
      }
      const prompt = buildGenerativeDebateStartPrompt({
        domain: domain.trim(),
        title: title.trim(),
        scenario: scenario.trim() || title.trim(),
        qa,
        steelmanText: steelmanText.trim() || null,
      });
      const text = await generatePlainTextRaw(prompt);
      return NextResponse.json({ ok: true, text });
    }

    const userReply = typeof b.userReply === "string" ? b.userReply : "";
    if (!userReply.trim()) {
      return NextResponse.json(
        { ok: false, error: "userReply is required for continue mode" },
        { status: 400 },
      );
    }
    const histRaw = b.history;
    const history: DebateChatMessage[] = [];
    if (Array.isArray(histRaw)) {
      for (const row of histRaw) {
        if (typeof row !== "object" || row === null) continue;
        const r = row as Record<string, unknown>;
        const role = r.role === "user" ? "user" : r.role === "assistant" ? "assistant" : null;
        const content = typeof r.content === "string" ? r.content : "";
        if (role && content) history.push({ role, content });
      }
    }
    const prompt = buildGenerativeDebateContinuePrompt({
      domain: domain.trim(),
      title: title.trim(),
      history,
      userReply: userReply.trim(),
    });
    const text = await generatePlainTextRaw(prompt);
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
