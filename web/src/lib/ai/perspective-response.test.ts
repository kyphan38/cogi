import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parsePerspectiveFetchJson } from "./perspective-response";

describe("parsePerspectiveFetchJson", () => {
  it("returns error for null", () => {
    const r = parsePerspectiveFetchJson(null, "analytical");
    expect(r.ok).toBe(false);
  });

  it("returns error for non-object", () => {
    const r = parsePerspectiveFetchJson("string", "analytical");
    expect(r.ok).toBe(false);
  });

  it("returns server error when ok is false with message", () => {
    const r = parsePerspectiveFetchJson(
      { ok: false, error: "Rate limited" },
      "analytical",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Rate limited");
  });

  it("returns error when ok is not true", () => {
    const r = parsePerspectiveFetchJson({ ok: "yes" }, "analytical");
    expect(r.ok).toBe(false);
  });

  it("returns success when structured field parses via union schema", () => {
    const structured = {
      embedded: [{ id: "e1", title: "T", body: "B" }],
      userFound: [],
      additional: [{ id: "a1", body: "More context" }],
      openQuestions: [{ id: "o1", body: "Think about this" }],
    };
    const r = parsePerspectiveFetchJson(
      { ok: true, text: "summary", structured },
      "analytical",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe("summary");
      expect(r.structured).toBeDefined();
    }
  });

  it("returns error when structured is missing and text cannot reparse", () => {
    const r = parsePerspectiveFetchJson(
      { ok: true, text: "not json" },
      "analytical",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("structured");
  });

  it("returns error for sequential kind without structured (no reparse path)", () => {
    const r = parsePerspectiveFetchJson(
      { ok: true, text: "some text" },
      "sequential",
    );
    expect(r.ok).toBe(false);
  });

  it("defaults text to empty string when not a string", () => {
    const structured = {
      embedded: [{ id: "e1", body: "B" }],
      userFound: [],
      additional: [{ id: "a1", body: "More" }],
      openQuestions: [{ id: "o1", body: "Q" }],
    };
    const r = parsePerspectiveFetchJson(
      { ok: true, text: 42, structured },
      "analytical",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toBe("");
  });
});
