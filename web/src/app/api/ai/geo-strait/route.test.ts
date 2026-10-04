import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth/server-route-auth", () => ({
  requireAuthenticatedRouteUser: (...a: unknown[]) => mockRequireAuth(...a),
}));

const mockGenerateRaw = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  generateAnalyticalExerciseRaw: (...a: unknown[]) => mockGenerateRaw(...a),
}));

import { POST } from "./route";
import { numbersIn, validateGeoStraitExplanation } from "@/lib/ai/validators/geo-strait";
import { buildGeoStraitPrompt, straitFactsText } from "@/lib/ai/prompts/geo-strait";
import { chokepointById } from "@/lib/geo/chokepoints";
import { scoreStrait } from "@/lib/geo/strait";

function request(body: unknown) {
  return new Request("http://localhost/api/ai/geo-strait", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const good = {
  summary: "You found two of the four main buyers. Most oil through Hormuz goes to Asia.",
  points: [
    "India buys a lot of Gulf oil, so it depends on the strait too.",
    "Pipelines can carry about 4.7 million barrels a day, far less than the 20.9 million that pass the strait.",
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  mockRequireAuth.mockResolvedValue({ ok: true, user: { uid: "u" }, idToken: "t" });
});

describe("POST /api/ai/geo-strait", () => {
  it("returns 401 when auth fails", async () => {
    mockRequireAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false }, { status: 401 }),
    });
    expect((await POST(request({}))).status).toBe(401);
  });

  it("rejects an unknown strait or a malformed body", async () => {
    expect((await POST(request({ chokepointId: "atlantis", picked: [], route: null }))).status).toBe(400);
    expect((await POST(request({ chokepointId: "gibraltar", picked: [], route: null }))).status).toBe(400);
    expect((await POST(request({ chokepointId: "hormuz", picked: ["China"], route: null }))).status).toBe(400);
  });

  it("returns the note and builds the prompt from the fixed facts", async () => {
    mockGenerateRaw.mockResolvedValue(JSON.stringify(good));
    const res = await POST(request({ chokepointId: "hormuz", picked: ["156", "392"], route: "cape" }));
    expect(res.status).toBe(200);
    expect((await res.json()).explanation).toEqual(good);
    const prompt = mockGenerateRaw.mock.calls[0]![0] as string;
    expect(prompt).toContain("20.9 million barrels a day");
    expect(prompt).toContain("Countries they picked that are on the list: China, Japan");
    expect(prompt).toContain("Countries on the list they missed: India, South Korea");
    expect(prompt).toContain("not the main way around");
  });

  it("retries once when the AI invents a number, then gives up", async () => {
    const invented = { ...good, points: ["Closing it would raise oil prices by 300% in a week.", "Pipelines are small."] };
    mockGenerateRaw.mockResolvedValue(JSON.stringify(invented));
    const res = await POST(request({ chokepointId: "hormuz", picked: [], route: null }));
    expect(res.status).toBe(422);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
    expect(mockGenerateRaw.mock.calls[1]![0]).toContain("Remove or fix: 300");
  });
});

describe("geo strait validator", () => {
  const facts = straitFactsText(chokepointById("malacca")!);

  it("reads numbers the way people write them", () => {
    expect(numbersIn("1,000 to 1,500 nautical miles, 23.2 million, in 2025, and 48%")).toEqual(["1000", "1500", "23.2", "2025", "48"]);
  });

  it("accepts numbers from the facts and rejects new ones", () => {
    expect(validateGeoStraitExplanation({ summary: "China took 48% of imports.", points: ["a", "b"] }, facts)).toEqual([]);
    expect(validateGeoStraitExplanation({ summary: "It adds 1,000 to 1,500 nautical miles.", points: ["a", "b"] }, facts)).toEqual([]);
    expect(validateGeoStraitExplanation({ summary: "About 60% of ships.", points: ["a", "b"] }, facts)[0]).toContain("60");
  });

  it("rejects Vietnamese words", () => {
    expect(validateGeoStraitExplanation({ summary: "Biển Đông", points: ["a", "b"] }, facts)).toHaveLength(1);
  });

  it("keeps the prompt to the fixed facts and the learner's result", () => {
    const cp = chokepointById("panama")!;
    const prompt = buildGeoStraitPrompt({ cp, result: scoreStrait(cp, ["840"], "south-america"), route: "south-america" });
    expect(prompt).toContain("United States (74.7%)");
    expect(prompt).toContain("8,000 nautical miles");
    expect(prompt).toContain("(right)");
    expect(prompt).toContain("Do not add any number");
  });
});
