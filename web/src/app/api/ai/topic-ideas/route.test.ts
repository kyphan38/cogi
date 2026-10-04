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

const request = (body: unknown) =>
  new Request("http://localhost/api/ai/topic-ideas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const MODES = ["judgment", "evaluative", "strategy", "systems", "analytical", "reframe"];
const GROUP: Record<string, string> = {
  judgment: "life-personal",
  evaluative: "life-personal",
  reframe: "life-personal",
  strategy: "business-economy",
  systems: "business-economy",
  analytical: "business-economy",
};
const ideas = (n: number, offset = 0) =>
  JSON.stringify({
    ideas: Array.from({ length: n }, (_, i) => {
      const mode = MODES[(i + offset) % MODES.length]!;
      return { title: `Everyday practice situation number ${i + offset} for you`, mode, group: GROUP[mode], domain: "" };
    }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "k");
  mockRequireAuth.mockResolvedValue({ ok: true, user: { uid: "u" }, idToken: "t" });
});

describe("POST /api/ai/topic-ideas", () => {
  it("returns 401 without auth and 400 for bad filters", async () => {
    mockRequireAuth.mockResolvedValueOnce({ ok: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await POST(request({ mode: "all" }))).status).toBe(401);
    expect((await POST(request({ mode: "calibration" }))).status).toBe(400);
    expect((await POST(request({ mode: "reframe", groupId: "technology" }))).status).toBe(400);
  });

  it("returns 10 diverse ideas from one call when the AI follows the rules", async () => {
    mockGenerateRaw.mockResolvedValue(ideas(14));
    const json = await (await POST(request({ mode: "all", exclude: [] }))).json();
    expect(json.ok).toBe(true);
    expect(json.ideas).toHaveLength(10);
    const perMode = new Map<string, number>();
    for (const i of json.ideas) perMode.set(i.mode, (perMode.get(i.mode) ?? 0) + 1);
    expect(Math.max(...perMode.values())).toBeLessThanOrEqual(2);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(1);
  });

  it("tops up once when too many ideas break the rules, avoiding what it already has", async () => {
    // First answer: 6 ideas, all one mode, so only 2 can be kept.
    const oneMode = JSON.stringify({
      ideas: Array.from({ length: 6 }, (_, i) => ({ title: `Everyday practice situation number ${i} for you`, mode: "judgment", group: "life-personal", domain: "" })),
    });
    mockGenerateRaw.mockResolvedValueOnce(oneMode).mockResolvedValueOnce(ideas(14, 6));
    const json = await (await POST(request({ mode: "all", exclude: [] }))).json();
    expect(json.ideas.length).toBeGreaterThanOrEqual(9);
    expect(json.ideas.filter((i: { mode: string }) => i.mode === "judgment").length).toBeLessThanOrEqual(2);
    expect(mockGenerateRaw).toHaveBeenCalledTimes(2);
    expect(mockGenerateRaw.mock.calls[1]![0]).toContain("- Everyday practice situation number 0 for you");
  });

  it("sends practised topics to the AI and filters them out of the answer", async () => {
    mockGenerateRaw.mockResolvedValue(ideas(14));
    const json = await (await POST(request({ mode: "all", exclude: ["Everyday practice situation number 0 for you"] }))).json();
    expect(mockGenerateRaw.mock.calls[0]![0]).toContain("- Everyday practice situation number 0 for you");
    expect(json.ideas.map((i: { title: string }) => i.title)).not.toContain("Everyday practice situation number 0 for you");
  });

  it("fails clearly when the AI gives almost nothing usable", async () => {
    mockGenerateRaw.mockResolvedValue(JSON.stringify({ ideas: [] }));
    expect((await POST(request({ mode: "judgment" }))).status).toBe(422);
  });
});
