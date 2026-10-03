import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/types/exercise";
import { isGeopoliticsAnalyticalDomain } from "./geopolitics-domains";
import { currentTrack, trackProgress, trackStepHref, TRACKS } from "./tracks";

const done = (type: string, domain: string, completedAt: string) =>
  ({ id: domain, type, domain, completedAt, createdAt: completedAt }) as unknown as Exercise;

describe("TRACKS", () => {
  it("never switches a beginner step to the expert-only geopolitics variant", () => {
    for (const t of TRACKS) for (const s of t.steps) expect(isGeopoliticsAnalyticalDomain(s.domain), s.domain).toBe(false);
  });

  it("uses unique ids", () => {
    const ids = TRACKS.flatMap((t) => [t.id, ...t.steps.map((s) => `${t.id}/${s.id}`)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("trackProgress", () => {
  const track = TRACKS[0]!;
  it("marks steps done by matching type and domain, and finds the next step", () => {
    const p = trackProgress(track, [
      done("analytical", track.steps[0]!.domain, "2026-10-01"),
      done("systems", track.steps[0]!.domain, "2026-10-01"), // same domain, other type: not this step
    ]);
    expect([...p.doneIds]).toEqual([track.steps[0]!.id]);
    expect(p.next?.id).toBe(track.steps[1]!.id);
  });

  it("returns no next step when all are done", () => {
    expect(trackProgress(track, track.steps.map((s) => done(s.type, s.domain, "2026-10-01"))).next).toBeNull();
  });
});

describe("currentTrack", () => {
  it("starts with the first track", () => {
    expect(currentTrack([])?.id).toBe(TRACKS[0]!.id);
  });

  it("follows the track worked on most recently", () => {
    const second = TRACKS[1]!;
    expect(currentTrack([done("analytical", second.steps[0]!.domain, "2026-10-02")])?.id).toBe(second.id);
  });

  it("skips finished tracks", () => {
    const first = TRACKS[0]!;
    const all = first.steps.map((s) => done(s.type, s.domain, "2026-10-03"));
    expect(currentTrack(all)?.id).toBe(TRACKS[1]!.id);
  });
});

describe("trackStepHref", () => {
  it("opens the exercise with the topic filled in", () => {
    expect(trackStepHref({ id: "x", type: "systems", domain: "A & B", learn: "" })).toBe("/exercise/systems?domain=A%20%26%20B");
  });
});
