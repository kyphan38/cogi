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

import { logAiCost } from "./ai-cost-log";

export const AI_QUOTA_MESSAGE = "AI credit is used up. Top it up in AI Studio, then try again.";

/**
 * fast: lists, labels and the simpler exercises (strategy, judgment, reframe).
 * create: analytical-style exercises. thinking: coaching, deep dive and
 * own-situation reframe (safety check). Hydrogen matched argon in tests and
 * ran 1.5-2x faster; Flash wrote weaker passages and timed out on coaching.
 */
export type GeminiModel = "fast" | "create" | "thinking";

type Level = "low" | "medium" | "high";
const LEVELS: Record<Level, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

const DEFAULTS: Record<GeminiModel, { model: string; thinking: Level | "default" }> = {
  fast: { model: "gemini-3.8-flash", thinking: "low" },
  // Medium timed out on creation (25 s budget); low did not.
  create: { model: "gemini-4-hydrogen", thinking: "low" },
  // Low put one wrong label on coaching cards; medium did not.
  thinking: { model: "gemini-4-hydrogen", thinking: "medium" },
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

/** Gemini's raw JSON errors as one plain line: the routes pass e.message to the screen. */
function plainGeminiError(e: unknown): unknown {
  // 504 DEADLINE_EXCEEDED: routes look for "timed out".
  if (e instanceof ApiError && e.status === 504) return new Error("Gemini request timed out");
  // Out of credit (402) or rate limited (429).
  if (e instanceof ApiError && (e.status === 402 || e.status === 429)) return new Error(AI_QUOTA_MESSAGE);
  return e;
}

/** Audio sent with a prompt, as base64. `mimeType` has no `;codecs=` part. */
export interface InlineAudio {
  data: string;
  mimeType: string;
}

async function generateText(
  fullPrompt: string,
  modelName: GeminiModel,
  timeoutMs: number,
  config: { temperature: number; responseMimeType?: string; responseJsonSchema?: unknown },
  audio?: InlineAudio,
): Promise<string> {
  let response;
  const { model, thinkingConfig } = tier(modelName);
  try {
    response = await getClient().models.generateContent({
      model,
      contents: audio ? [{ role: "user", parts: [{ inlineData: audio }, { text: fullPrompt }] }] : fullPrompt,
      config: {
        ...config,
        ...(thinkingConfig ? { thinkingConfig } : {}),
        httpOptions: { timeout: timeoutMs },
      },
    });
  } catch (e) {
    throw plainGeminiError(e);
  }
  await logAiCost(model, response.usageMetadata);
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

/** JSON mode with one audio clip, e.g. a spoken answer to transcribe and judge. */
export async function generateJsonFromAudio(
  fullPrompt: string,
  audio: InlineAudio,
  modelName: GeminiModel = "fast",
  timeoutMs: number = 40_000,
  responseJsonSchema?: unknown,
): Promise<string> {
  return generateText(
    fullPrompt,
    modelName,
    timeoutMs,
    { temperature: 0.2, responseMimeType: "application/json", ...(responseJsonSchema ? { responseJsonSchema } : {}) },
    audio,
  );
}

export interface WebSource {
  title: string;
  uri: string;
}

/**
 * Plain text written with Google Search. Returns the text and the pages the search
 * used. No JSON mode here: a second, plain call shapes the text.
 */
export async function generateWithSearch(
  fullPrompt: string,
  modelName: GeminiModel = "fast",
  timeoutMs: number = 35_000,
): Promise<{ text: string; sources: WebSource[] }> {
  let response;
  const { model, thinkingConfig } = tier(modelName);
  try {
    response = await getClient().models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        temperature: 0.3,
        tools: [{ googleSearch: {} }],
        ...(thinkingConfig ? { thinkingConfig } : {}),
        httpOptions: { timeout: timeoutMs },
      },
    });
  } catch (e) {
    throw plainGeminiError(e);
  }
  await logAiCost(model, response.usageMetadata);
  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  const seen = new Set<string>();
  const sources: WebSource[] = [];
  for (const chunk of response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
    const uri = chunk.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({ title: chunk.web?.title?.trim() || "Source", uri });
  }
  return { text, sources };
}
