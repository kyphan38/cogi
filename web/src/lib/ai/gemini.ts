/**
 * Gemini client on the Google Gen AI SDK (`@google/genai`), which replaced the
 * deprecated `@google/generative-ai` (support ended 2025-08-31).
 *
 * The SDK does not retry on its own unless `retryOptions` is set, and it is left
 * unset on purpose: `generateValidatedJson` owns the single retry on a bad
 * response, and extra transport retries would blow the route's time budget.
 * A timeout rejects with an AbortError.
 */
import { GoogleGenAI } from "@google/genai";

export type GeminiModel = "fast" | "thinking";

const MODEL_IDS: Record<GeminiModel, string> = {
  fast: process.env.GEMINI_MODEL_FAST ?? process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  thinking: process.env.GEMINI_MODEL_THINKING ?? "gemini-3.8-flash",
};

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
  const response = await getClient().models.generateContent({
    model: MODEL_IDS[modelName],
    contents: fullPrompt,
    config: { ...config, httpOptions: { timeout: timeoutMs } },
  });
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
