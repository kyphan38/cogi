/**
 * Gemini client on the Google Gen AI SDK (`@google/genai`), which replaced the
 * deprecated `@google/generative-ai` (support ended 2025-08-31).
 *
 * The SDK does not retry on its own unless `retryOptions` is set, and it is left
 * unset on purpose: `generateValidatedJson` owns the single retry on a bad
 * response, and extra transport retries would blow the route's time budget.
 * A timeout rejects with an AbortError, or with a "timed out" Error when Gemini's own
 * deadline (sent as X-Server-Timeout) fires first.
 */
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * fast: lists, labels and the simpler exercises (strategy, judgment, reframe).
 * thinking: analytical-style exercises and all coaching. In tests Flash wrote
 * weaker analytical passages and timed out on coaching, so these stay on argon.
 */
export type GeminiModel = "fast" | "thinking";

type Level = "low" | "medium" | "high";
const LEVELS: Record<Level, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

const DEFAULTS: Record<GeminiModel, { model: string; thinking: Level | "default" }> = {
  fast: { model: "gemini-3.8-flash", thinking: "low" },
  thinking: { model: "gemini-4-argon", thinking: "default" },
};

/** Env overrides (GEMINI_MODEL_FAST, GEMINI_THINKING_FAST, ...), read per call. */
function tier(name: GeminiModel): { model: string; thinkingConfig?: { thinkingLevel: ThinkingLevel } } {
  const key = name.toUpperCase();
  const model = process.env[`GEMINI_MODEL_${key}`]?.trim() || DEFAULTS[name].model;
  const level = process.env[`GEMINI_THINKING_${key}`]?.trim() || DEFAULTS[name].thinking;
  return level in LEVELS ? { model, thinkingConfig: { thinkingLevel: LEVELS[level as Level] } } : { model };
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

async function generateText(
  fullPrompt: string,
  modelName: GeminiModel,
  timeoutMs: number,
  config: { temperature: number; responseMimeType?: string; responseJsonSchema?: unknown },
): Promise<string> {
  let response;
  try {
    const { model, thinkingConfig } = tier(modelName);
    response = await getClient().models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        ...config,
        ...(thinkingConfig ? { thinkingConfig } : {}),
        httpOptions: { timeout: timeoutMs },
      },
    });
  } catch (e) {
    // Gemini returns 504 DEADLINE_EXCEEDED with a raw JSON message; routes look for "timed out".
    if (e instanceof ApiError && e.status === 504) throw new Error("Gemini request timed out");
    throw e;
  }
  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}

/**
 * JSON mode. Pass `responseJsonSchema` (a JSON Schema, e.g. from `z.toJSONSchema`)
 * to have Gemini follow the shape; parsing and checks stay with the caller.
 */
export async function generateAnalyticalExerciseRaw(
  fullPrompt: string,
  modelName: GeminiModel = "fast",
  timeoutMs: number = 25_000,
  responseJsonSchema?: unknown,
): Promise<string> {
  return generateText(fullPrompt, modelName, timeoutMs, {
    temperature: 0.35,
    responseMimeType: "application/json",
    ...(responseJsonSchema ? { responseJsonSchema } : {}),
  });
}

/** Narrative / markdown - no JSON mode. */
export async function generatePlainTextRaw(
  fullPrompt: string,
  modelName: GeminiModel = "fast",
  timeoutMs: number = 25_000,
): Promise<string> {
  return generateText(fullPrompt, modelName, timeoutMs, { temperature: 0.45 });
}
