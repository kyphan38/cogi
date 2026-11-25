import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/types/exercise";
import {
  buildNextTrack,
  closeTrack,
  genTrackProgress,
  isStale,
  missingTopics,
  OWN_TYPES,
  PAST_KEEP,
  withRecap,
  type BuildInput,
  type GenTrack,
  type TrackRecap,
} from "./adaptive";

const NOW = "2026-11-25T08:00:00.000Z";
const TODAY = "2026-11-25";

/** A finished analytical row; `missed` and `found` are issue types. */
function analytical(
  id: string,
  opts: { day?: string; domain?: string; missed?: string[]; found?: string[]; step?: string } = {},
): Exercise {
  const missed = opts.missed ?? [];
  const found = opts.found ?? [];
  const issues = [...missed.map((type) => ({ type, found: false })), ...found.map((type) => ({ type, found: true }))].map(
    (i, index) => ({ index, ...i, severity: "moderate", highlightId: null, userTag: null, tagCorrect: i.found }),
  );
  const at = `${opts.day ?? "2026-11-20"}T10:00:00.000Z`;
  return {
    id,
    type: "analytical",
    domain: opts.domain ?? `Topic ${id}`,
    title: `Title ${id}`,
    passage: "",
    embeddedIssues: [],
    validPoints: [],
    userHighlights: [],
    result: {
      issues,
      decoys: [],
      extraHighlightIds: [],
      found: found.length,
      total: issues.length,
      tagsCorrect: found.length,
      trapsHit: 0,
      decoyTotal: 0,
    },
    trackStepId: opts.step,
    createdAt: at,
    completedAt: at,
  } as unknown as Exercise;
}

const input = (patch: Partial<BuildInput> = {}): BuildInput => {
  const completed = patch.completed ?? [];
  return {
    id: "t1",
    n: 1,
    now: NOW,
    today: TODAY,
    completed,
    all: completed,
    practiced: new Set(),
    saved: [],
    past: [],
    ...patch,
  };
};

const kinds = (t: GenTrack) => t.steps.map((s) => s.kind);
const typeCounts = (t: GenTrack) => {
  const m = new Map<string, number>();
  for (const s of t.steps) m.set(s.type, (m.get(s.type) ?? 0) + 1);
  return m;
};

describe("buildNextTrack", () => {
  it("cold start: five new steps of different types, then own", () => {
    const t = buildNextTrack(input());
    expect(kinds(t)).toEqual(["new", "new", "new", "new", "new", "own"]);
    expect(t.steps.map((s) => s.id)).toEqual(["t1-1", "t1-2", "t1-3", "t1-4", "t1-5", "t1-6"]);
    expect(new Set(t.steps.slice(0, 5).map((s) => s.type)).size).toBe(5);
    expect(t.targets).toEqual([]);
    expect(t.steps.at(-1)).toMatchObject({ kind: "own", domain: "" });
    // The topic tracks only cover four types, so the fifth new step has no topic yet.
    expect(missingTopics(t)).toBe(1);
  });

  it("fills a missing topic from saved ideas first, then from AI ideas", () => {
    const saved = buildNextTrack(input({ saved: [{ mode: "strategy", title: "Two cafes on one street" }] }));
    expect(missingTopics(saved)).toBe(0);
    expect(saved.steps.find((s) => s.type === "strategy")).toMatchObject({ domain: "Two cafes on one street", source: "saved" });
    const ai = buildNextTrack(input({ aiIdeas: [{ mode: "reframe", title: "A harsh code review" }] }));
    expect(ai.steps.find((s) => s.source === "ai")).toMatchObject({ type: "reframe", domain: "A harsh code review" });
  });

  it("one target: new (same type), fix, new, second fix, new, own; at most three of a type", () => {
    const completed = [1, 2, 3].map((i) => analytical(`a${i}`, { missed: ["hidden_assumption"], found: ["bias"] }));
    const t = buildNextTrack(input({ completed }));
    expect(t.targets).toEqual(["analytical:hidden_assumption"]);
    expect(t.baseline).toEqual({ "analytical:hidden_assumption": { misses: 3, chances: 3 } });
    expect(kinds(t)).toEqual(["new", "fix", "new", "fix", "new", "own"]);
    expect(t.steps[0]!.type).toBe("analytical");
    expect(t.steps[1]).toMatchObject({ type: "analytical", focus: "analytical:hidden_assumption" });
    expect(t.steps[3]).toMatchObject({ type: "analytical", focus: "analytical:hidden_assumption" });
    expect(t.steps[1]!.domain).not.toBe(t.steps[3]!.domain);
    expect(Math.max(...typeCounts(t).values())).toBeLessThanOrEqual(3);
    expect(typeCounts(t).size).toBeGreaterThanOrEqual(3);
    expect(t.steps[5]!.type).not.toBe("analytical");
    expect(OWN_TYPES).toContain(t.steps[5]!.type);
  });

  it("redoes an old poor exercise of a target type when one is ready", () => {
    const completed = [
      analytical("recent", { day: "2026-11-20", missed: ["hidden_assumption", "weak_evidence"] }),
      analytical("old", { day: "2026-09-01", missed: ["hidden_assumption", "weak_evidence"], domain: "Old memo" }),
    ];
    const t = buildNextTrack(input({ completed }));
    expect(t.targets).toHaveLength(2);
    expect(t.steps[3]).toMatchObject({ kind: "redo", type: "analytical", redoOf: "old", domain: "Old memo" });
  });

  it("never offers a topic already done or practised", () => {
    const first = buildNextTrack(input());
    const topic = first.steps[0]!.domain;
    const done = buildNextTrack(input({ completed: [analytical("x", { domain: topic, found: ["bias"] })] }));
    expect(done.steps.map((s) => s.domain)).not.toContain(topic);
    const practised = buildNextTrack(input({ practiced: new Set([topic.toLowerCase()]) }));
    expect(practised.steps.map((s) => s.domain)).not.toContain(topic);
  });

  it("skips a target the last recap marked cleared", () => {
    const completed = [1, 2, 3].map((i) => analytical(`a${i}`, { missed: ["hidden_assumption"] }));
    const past = [{ targets: [{ key: "analytical:hidden_assumption", cleared: true }] } as unknown as TrackRecap];
    expect(buildNextTrack(input({ completed, past })).targets).toEqual([]);
  });
});

describe("progress, stale and close", () => {
  const track: GenTrack = {
    id: "t2",
    n: 2,
    startedAt: "2026-11-01T08:00:00.000Z",
    targets: ["analytical:hidden_assumption"],
    baseline: { "analytical:hidden_assumption": { misses: 4, chances: 6 } },
    steps: [1, 2, 3, 4, 5, 6].map((i) => ({ id: `t2-${i}`, kind: "new" as const, type: "analytical" as const, domain: `D${i}` })),
  };

  it("counts a step done only by its own step id, and passes skipped steps", () => {
    const completed = [analytical("x", { step: "t2-1", found: ["bias"] }), analytical("y", { domain: "D2", found: ["bias"] })];
    const skipped = { ...track, steps: track.steps.map((s) => (s.id === "t2-2" ? { ...s, skipped: true } : s)) };
    const p = genTrackProgress(skipped, completed);
    expect([...p.doneIds]).toEqual(["t2-1"]);
    expect(p.next?.id).toBe("t2-3");
    const all = { ...track, steps: track.steps.map((s) => ({ ...s, skipped: true })) };
    expect(genTrackProgress(all, []).finished).toBe(true);
  });

  it("is stale after 14 days without a finished step", () => {
    expect(isStale(track, [], "2026-11-14")).toBe(false);
    expect(isStale(track, [], "2026-11-15")).toBe(true);
    const recent = [analytical("x", { day: "2026-11-10", step: "t2-1" })];
    expect(isStale(track, recent, "2026-11-15")).toBe(false);
    expect(isStale(track, recent, "2026-11-24")).toBe(true);
  });

  it("recaps before and during; cleared needs two tracks below the line", () => {
    const completed = [
      analytical("a", { step: "t2-1", found: ["hidden_assumption", "bias"] }),
      analytical("b", { step: "t2-2", missed: ["hidden_assumption"], found: ["hidden_assumption", "bias"] }),
      analytical("c", { missed: ["hidden_assumption"] }),
    ];
    const skipped = { ...track, steps: track.steps.map((s) => (s.id === "t2-6" ? { ...s, skipped: true } : s)) };
    const first = closeTrack(skipped, completed, [], "done", NOW);
    expect(first).toMatchObject({ n: 2, done: 2, skipped: 1, total: 6, closeReason: "done", closedAt: NOW });
    expect(first.ratings.good + first.ratings.ok + first.ratings.poor).toBe(2);
    expect(first.targets[0]).toEqual({
      key: "analytical:hidden_assumption",
      before: { misses: 4, chances: 6 },
      during: { misses: 1, chances: 3 },
      below: true,
      cleared: false,
    });
    const second = closeTrack(skipped, completed, [first], "done", NOW);
    expect(second.targets[0]!.cleared).toBe(true);
  });

  it("an untouched target is not below the line", () => {
    const recap = closeTrack(track, [], [], "stale", NOW);
    expect(recap.targets[0]).toMatchObject({ during: { misses: 0, chances: 0 }, below: false, cleared: false });
  });

  it("keeps the newest recaps first, without duplicates", () => {
    const r = (id: string) => ({ id }) as TrackRecap;
    const past = Array.from({ length: PAST_KEEP }, (_, i) => r(`p${i}`));
    const next = withRecap(past, r("new"));
    expect(next).toHaveLength(PAST_KEEP);
    expect(next[0]!.id).toBe("new");
    expect(withRecap([r("a")], r("a"))).toHaveLength(1);
  });
});
