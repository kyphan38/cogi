import { describe, expect, it } from "vitest";
import { ACTORS, actorById } from "./actors";
import { GEO_GAME_CASES, GEO_GAME_LABELS, geoGameCaseById } from "./game-cases";
import type { GeoSource } from "./types";

const validSource = (s: GeoSource) => s.label.trim().length > 0 && /^https?:\/\/\S+$/.test(s.url);
const VIETNAMESE = /[ăĂđĐơƠưƯẠ-ỹ]/;

describe("country cards", () => {
  it("has 10 actors with unique ids", () => {
    expect(ACTORS).toHaveLength(10);
    expect(new Set(ACTORS.map((a) => a.id)).size).toBe(10);
    expect(actorById("vietnam")?.name).toBe("Vietnam");
  });

  it("gives every actor what it says, a strength and a weak spot, each line with a source", () => {
    for (const a of ACTORS) {
      expect(a.says.length, a.id).toBeGreaterThan(0);
      expect(a.strengths.length, a.id).toBeGreaterThan(0);
      expect(a.weakSpots.length, a.id).toBeGreaterThan(0);
      for (const line of [...a.says, ...a.redLines, ...a.strengths, ...a.weakSpots, ...a.partners]) {
        expect(line.text.trim().endsWith("."), `${a.id}: ${line.text}`).toBe(true);
        expect(validSource(line.source), `${a.id}: ${line.text}`).toBe(true);
      }
    }
  });

  it("attributes every statement to the side that made it, with a year", () => {
    for (const a of ACTORS) {
      for (const line of [...a.says, ...a.redLines]) {
        expect(/\b(19|20)\d{2}\b/.test(line.text) || /Charter/.test(line.text), `${a.id}: ${line.text}`).toBe(true);
      }
    }
  });

  it("is written in English only", () => {
    expect(VIETNAMESE.test(JSON.stringify(ACTORS.map((a) => ({ ...a, urls: undefined }))).replace(/https?:[^"]+/g, ""))).toBe(false);
  });
});

describe("real game cases", () => {
  it("has one case for each game type", () => {
    expect(GEO_GAME_CASES).toHaveLength(5);
    expect(new Set(GEO_GAME_CASES.map((c) => c.gameType))).toEqual(new Set(Object.keys(GEO_GAME_LABELS)));
    expect(new Set(GEO_GAME_CASES.map((c) => c.id)).size).toBe(5);
  });

  it("gives every case sources, two sides with two choices, an outcome and blocked real names", () => {
    for (const c of GEO_GAME_CASES) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      c.sources.forEach((s) => expect(validSource(s), c.id).toBe(true));
      if (c.modelNote) expect(validSource(c.modelNote.source), c.id).toBe(true);
      expect(c.players.A.choices, c.id).toHaveLength(2);
      expect(c.players.B.choices, c.id).toHaveLength(2);
      expect(c.whatHappened.length, c.id).toBeGreaterThan(40);
      expect(c.realNames.length, c.id).toBeGreaterThan(2);
      c.actorIds.forEach((id) => expect(actorById(id), `${c.id}: ${id}`).toBeDefined());
      expect(VIETNAMESE.test(`${c.summary} ${c.whatHappened} ${c.lesson}`), c.id).toBe(false);
    }
  });

  it("finds a case by id and ignores anything else", () => {
    expect(geoGameCaseById("cuba-1962")?.gameType).toBe("chicken");
    expect(geoGameCaseById("Business & prices")).toBeUndefined();
    expect(geoGameCaseById(undefined)).toBeUndefined();
  });
});
