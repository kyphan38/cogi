import { describe, expect, it } from "vitest";
import { actorById } from "./actors";
import { makeTimelineRow } from "./rows";
import { TIMELINE_CASES, confidenceSummary, judgeDecision, orderQuizEvents, timelineById } from "./timelines";

const VIETNAMESE = /[ăĂđĐơƠưƯẠ-ỹ]/;

describe("timeline cases", () => {
  it("has 5 cases with 5-8 dated, sourced events each, in date order", () => {
    expect(TIMELINE_CASES).toHaveLength(5);
    for (const c of TIMELINE_CASES) {
      expect(c.events.length, c.id).toBeGreaterThanOrEqual(5);
      expect(c.events.length, c.id).toBeLessThanOrEqual(8);
      expect(new Set(c.events.map((e) => e.id)).size, c.id).toBe(c.events.length);
      c.events.forEach((e, i) => {
        expect(/^\d{4}-\d{2}-\d{2}$/.test(e.date) && !Number.isNaN(Date.parse(e.date)), e.id).toBe(true);
        expect(e.dateLabel.includes(e.date.slice(0, 4)), e.id).toBe(true);
        expect(/^https:\/\//.test(e.source.url), e.id).toBe(true);
        if (i > 0) expect(e.date >= c.events[i - 1]!.date, e.id).toBe(true);
      });
      c.actorIds.forEach((id) => expect(actorById(id), id).toBeDefined());
    }
  });

  it("gives every case 2 decision points with 3 options, one of them what really happened", () => {
    for (const c of TIMELINE_CASES) {
      expect(c.decisions, c.id).toHaveLength(2);
      for (const d of c.decisions) {
        expect(c.events.some((e) => e.id === d.beforeEventId), d.id).toBe(true);
        expect(d.options, d.id).toHaveLength(3);
        expect(d.options.some((o) => o.id === d.realOptionId), d.id).toBe(true);
        expect(/^https:\/\//.test(d.source.url), d.id).toBe(true);
      }
      // Decisions come in timeline order.
      const idx = c.decisions.map((d) => c.events.findIndex((e) => e.id === d.beforeEventId));
      expect(idx[0]! <= idx[1]!, c.id).toBe(true);
    }
  });

  it("is written in English only", () => {
    const text = JSON.stringify(TIMELINE_CASES.map((c) => ({ ...c, events: c.events.map((e) => e.text) })));
    expect(VIETNAMESE.test(text.replace(/"(label|url)":"[^"]*"/g, ""))).toBe(false);
  });
});

describe("timeline logic", () => {
  const cuba = timelineById("cuba-1962")!;
  const d1 = cuba.decisions[0]!;

  it("calls a choice close or different, never right or wrong", () => {
    expect(judgeDecision(d1, "quarantine", 80)).toEqual({ decisionId: "cuba-d1", optionId: "quarantine", confidence: 80, verdict: "close" });
    expect(judgeDecision(d1, "strike", 60).verdict).toBe("different");
  });

  it("sums up confidence against how often the choice was close", () => {
    const answers = [judgeDecision(d1, "quarantine", 90), judgeDecision(cuba.decisions[1]!, "attack", 70)];
    expect(confidenceSummary(answers)).toEqual({ avgConfidence: 80, closeRate: 50 });
    expect(confidenceSummary([])).toBeNull();
  });

  it("picks up to 4 events with different dates for the order question", () => {
    for (const c of TIMELINE_CASES) {
      const q = orderQuizEvents(c);
      expect(q.length, c.id).toBe(Math.min(4, new Set(c.events.map((e) => e.date)).size));
      expect(new Set(q.map((e) => e.date)).size, c.id).toBe(q.length);
    }
  });

  it("saves a finished timeline as a Geo Lab row", () => {
    const row = makeTimelineRow(
      { caseId: "suez-1956", answers: [], orderCorrect: 3, orderTotal: 4, offRampPicked: "s5", offRampCorrect: true },
      "2026-10-04T08:00:00.000Z",
    );
    expect(row).toMatchObject({ type: "geo", variant: "timeline", title: "Timeline: The Suez Crisis" });
  });
});
