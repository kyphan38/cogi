import { GoogleGenerativeAI } from "@google/generative-ai";

function getGeminiApiKey(): string {
  const trimmed = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!trimmed) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return trimmed;
}

/**
 * Default model id - Google may rename; override with GEMINI_MODEL in .env.local.
 * responseMimeType: application/json - see IMP-12 tuning in route if parse rate drops.
 */
export async function generateAnalyticalExerciseRaw(
  fullPrompt: string,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const modelId = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  });
  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}

/** Narrative / markdown - no JSON mode. */
export async function generatePlainTextRaw(fullPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  const modelId = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      temperature: 0.45,
    },
  });
  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}
