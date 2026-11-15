import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const generateContent = vi.fn();
vi.mock("@google/genai", async () => {
  const real = await vi.importActual<typeof import("@google/genai")>("@google/genai");
  return {
    ...real,
    GoogleGenAI: class {
      models = { generateContent };
    },
  };
});

describe("Gemini out of credit", () => {
  it("turns a 402 into one plain line", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const { ApiError } = await import("@google/genai");
    generateContent.mockRejectedValueOnce(new ApiError({ message: '{"error":{"code":402}}', status: 402 }));
    const { generatePlainTextRaw, AI_QUOTA_MESSAGE } = await import("@/lib/ai/gemini");
    await expect(generatePlainTextRaw("hi")).rejects.toThrow(AI_QUOTA_MESSAGE);
  });
});
