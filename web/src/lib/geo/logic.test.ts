import { describe, expect, it } from "vitest";
import { chokepointById, nauticalMilesToKm } from "./chokepoints";
import { distanceKm, distanceToTargetKm, fitProjection } from "./geometry";
import { placeById, placeQuestion, type Place } from "./places";
import { addDays, pickQuizPlaces, reviewCounts, reviewSchedule, scoreTap, type QuizAttempt } from "./quiz";
import { REGIONS } from "./regions";
import { scoreStrait, straitChoices } from "./strait";
import type { LonLat } from "./types";

describe("distances", () => {
  it("measures great-circle distance in km", () => {
    // Hanoi to Ho Chi Minh City is about 1,140 km in a straight line.
    expect(distanceKm([105.85, 21.03], [106.66, 10.76])).toBeGreaterThan(1100);
    expect(distanceKm([105.85, 21.03], [106.66, 10.76])).toBeLessThan(1180);
    expect(distanceKm([10, 10], [10, 10])).toBe(0);
  });

  it("measures distance to the nearest part of a line target", () => {
    const line: LonLat[] = [[0, 0], [10, 0]];
    expect(distanceToTargetKm([5, 0], line)).toBeLessThan(1);
    // 1 degree of latitude is about 111 km.
    expect(distanceToTargetKm([5, 1], line)).toBeGreaterThan(105);
    expect(distanceToTargetKm([5, 1], line)).toBeLessThan(116);
  });

  it("converts nautical miles exactly", () => {
    expect(nauticalMilesToKm(1000)).toBe(1852);
  });
});

describe("map projection", () => {
  it("fits every region inside the drawing and maps back to the same place", () => {
    for (const [id, { bbox }] of Object.entries(REGIONS)) {
      const { projection, height } = fitProjection(bbox, 600);
      expect(height, id).toBeGreaterThanOrEqual(270);
      expect(height, id).toBeLessThanOrEqual(600);
      const [w, s, e, n] = bbox;
      const lon = (w + e) / 2;
      const centre: LonLat = [lon > 180 ? lon - 360 : lon, (s + n) / 2];
      const xy = projection(centre)!;
      expect(xy[0], id).toBeGreaterThan(0);
      expect(xy[0], id).toBeLessThan(600);
      expect(xy[1], id).toBeGreaterThan(0);
      expect(xy[1], id).toBeLessThan(height);
      const back = projection.invert!(xy)!;
      expect(distanceKm(back as LonLat, centre), id).toBeLessThan(1);
    }
  });

  it("keeps a view across the date line in one piece", () => {
    const { projection } = fitProjection(REGIONS["north-pacific"].bbox, 600);
    const [x1] = projection([170, 55])!;
    const [x2] = projection([-170, 55])!;
    expect(x2).toBeGreaterThan(x1);
  });
});

describe("map quiz scoring", () => {
  const hanoi = placeById("hanoi")!;

  it("counts a tap within the tolerance and misses one outside it", () => {
    expect(scoreTap(hanoi, [105.9, 21.1]).correct).toBe(true);
    const far = scoreTap(hanoi, [106.66, 10.76]);
    expect(far.correct).toBe(false);
    expect(far.distanceKm).toBeGreaterThan(1000);
  });

  it("treats 'I don't know' as a miss with no distance", () => {
    expect(scoreTap(hanoi, null)).toEqual({ placeId: "hanoi", tap: null, distanceKm: null, correct: false });
  });

  it("never counts a sea answer tapped on land", () => {
    const scs = placeById("south-china-sea")!;
    expect(scoreTap(scs, [113, 12]).correct).toBe(true);
    expect(scoreTap(scs, [113, 12], true)).toMatchObject({ correct: false, onLand: true });
  });

  it("phrases questions naturally", () => {
    expect(placeQuestion(hanoi)).toBe("Tap Hanoi, the capital of Vietnam.");
    expect(placeQuestion(placeById("hormuz")!)).toBe("Tap the Strait of Hormuz.");
    expect(placeQuestion(placeById("bab-el-mandeb")!)).toBe("Tap Bab el-Mandeb.");
    expect(placeQuestion(placeById("first-island-chain")!)).toBe("Tap the first island chain.");
  });
});

describe("spaced review", () => {
  const miss = (placeId: string, day: string): QuizAttempt => ({ placeId, correct: false, day });
  const hit = (placeId: string, day: string): QuizAttempt => ({ placeId, correct: true, day });

  it("adds days across month ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-29", 7)).toBe("2027-01-05");
  });

  it("brings a missed place back after 1, then 3, then 7 days, and then stops", () => {
    let attempts = [miss("hanoi", "2026-10-01")];
    expect(reviewSchedule(attempts).get("hanoi")).toEqual({ step: 0, due: "2026-10-02" });
    attempts = [...attempts, hit("hanoi", "2026-10-02")];
    expect(reviewSchedule(attempts).get("hanoi")).toEqual({ step: 1, due: "2026-10-05" });
    attempts = [...attempts, hit("hanoi", "2026-10-05")];
    expect(reviewSchedule(attempts).get("hanoi")).toEqual({ step: 2, due: "2026-10-12" });
    attempts = [...attempts, hit("hanoi", "2026-10-12")];
    expect(reviewSchedule(attempts).has("hanoi")).toBe(false);
  });

  it("starts the review again after another miss", () => {
    const attempts = [miss("hanoi", "2026-10-01"), hit("hanoi", "2026-10-02"), miss("hanoi", "2026-10-05")];
    expect(reviewSchedule(attempts).get("hanoi")).toEqual({ step: 0, due: "2026-10-06" });
  });

  it("does not schedule a place that was right the first time", () => {
    expect(reviewSchedule([hit("hanoi", "2026-10-01")]).size).toBe(0);
  });

  it("counts places in review and those due", () => {
    const attempts = [miss("hanoi", "2026-10-01"), miss("tokyo", "2026-10-03")];
    expect(reviewCounts(attempts, "2026-10-02")).toEqual({ inReview: 2, due: 1 });
  });
});

describe("picking quiz places", () => {
  it("starts a new user on easy places of different kinds", () => {
    const picked = pickQuizPlaces({ attempts: [], today: "2026-10-04" });
    expect(picked).toHaveLength(5);
    expect(picked.every((p) => p.level === 1)).toBe(true);
    expect(new Set(picked.map((p) => p.kind)).size).toBe(5);
  });

  it("is the same all day and changes from day to day", () => {
    const a = pickQuizPlaces({ attempts: [], today: "2026-10-04" }).map((p) => p.id);
    expect(pickQuizPlaces({ attempts: [], today: "2026-10-04" }).map((p) => p.id)).toEqual(a);
    expect(pickQuizPlaces({ attempts: [], today: "2026-10-05" }).map((p) => p.id)).not.toEqual(a);
  });

  it("asks due reviews first and skips places already asked today", () => {
    const attempts: QuizAttempt[] = [
      { placeId: "tokyo", correct: false, day: "2026-10-03" },
      { placeId: "hanoi", correct: true, day: "2026-10-03" },
    ];
    const picked = pickQuizPlaces({ attempts, today: "2026-10-04" });
    expect(picked[0]!.id).toBe("tokyo");
    expect(picked.map((p) => p.id)).not.toContain("hanoi");
    const again = pickQuizPlaces({ attempts, today: "2026-10-04", exclude: new Set(["tokyo"]) });
    expect(again.map((p) => p.id)).not.toContain("tokyo");
  });

  it("falls back to places seen longest ago when nothing is new", () => {
    const places = [placeById("hanoi")!, placeById("tokyo")!] as Place[];
    const attempts: QuizAttempt[] = [
      { placeId: "tokyo", correct: true, day: "2026-09-01" },
      { placeId: "hanoi", correct: true, day: "2026-09-20" },
    ];
    expect(pickQuizPlaces({ attempts, today: "2026-10-04", places, count: 2 }).map((p) => p.id)).toEqual(["tokyo", "hanoi"]);
  });
});

describe("close the strait scoring", () => {
  const hormuz = chokepointById("hormuz")!;

  it("splits picks into found, missed and extra, and checks the route", () => {
    const r = scoreStrait(hormuz, ["156", "392", "840"], "gulf-pipelines");
    expect(r.found.sort()).toEqual(["156", "392"]);
    expect(r.missed.sort()).toEqual(["356", "410"]);
    expect(r.extra).toEqual(["840"]);
    expect(r.routeCorrect).toBe(true);
    expect(scoreStrait(hormuz, [], "cape").routeCorrect).toBe(false);
    expect(scoreStrait(hormuz, [], null).routeCorrect).toBe(false);
  });

  it("offers answers and decoys together in A to Z order", () => {
    const choices = straitChoices(hormuz);
    expect(choices).toHaveLength(8);
    expect(choices[0]).toBe("036"); // Australia
  });
});
