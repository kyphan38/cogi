import { describe, expect, it } from "vitest";
import { ALT_ROUTES, CHOKEPOINTS, STRAIT_GAME_IDS } from "./chokepoints";
import { COUNTRY_NAMES } from "./countries";
import { PLACES, placeById, placeName, RELATED_PLACES } from "./places";
import { REGIONS, bboxContains } from "./regions";
import { countryFeatures, isOnLand } from "./world";
import type { GeoSource, LonLat } from "./types";

const validCoord = ([lon, lat]: LonLat) =>
  Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;

const validSource = (s: GeoSource) => s.label.trim().length > 0 && /^https:\/\/\S+$/.test(s.url);

/** Letters only Vietnamese uses; the app is English-only. */
const VIETNAMESE = /[ăĂđĐơƠưƯẠ-ỹ]/;

describe("chokepoints data", () => {
  it("has unique ids, valid coordinates and a source for every fact", () => {
    const ids = CHOKEPOINTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CHOKEPOINTS) {
      expect(validCoord(c.coords), c.id).toBe(true);
      expect(validSource(c.coordsSource), c.id).toBe(true);
      expect(c.why.trim(), c.id).not.toBe("");
      expect(c.facts.length, c.id).toBeGreaterThan(0);
      for (const f of c.facts) expect(validSource(f.source), `${c.id}: ${f.label}`).toBe(true);
    }
  });

  it("gives every strait game a sourced answer, fair choices and a route option that fits", () => {
    expect(STRAIT_GAME_IDS.length).toBeGreaterThanOrEqual(6);
    for (const c of CHOKEPOINTS) {
      const g = c.game;
      if (!g) continue;
      expect(g.dependents.length, c.id).toBeGreaterThan(0);
      expect(g.decoys.length, c.id).toBeGreaterThanOrEqual(3);
      expect(g.decoys.filter((d) => g.dependents.includes(d)), c.id).toEqual([]);
      expect(g.dependentsSources.length, c.id).toBeGreaterThan(0);
      g.dependentsSources.forEach((s) => expect(validSource(s), c.id).toBe(true));
      expect(validSource(g.detour.source), c.id).toBe(true);
      expect(g.routeOptions, c.id).toContain(g.route);
      expect(new Set(g.routeOptions).size, c.id).toBe(3);
      expect(bboxContains(g.view, c.coords), `${c.id} view`).toBe(true);
      for (const path of ALT_ROUTES[g.route].paths) {
        for (const p of path) expect(bboxContains(g.view, p), `${c.id} view ${p}`).toBe(true);
      }
    }
  });

  it("names only countries that exist as shapes on the map", () => {
    const shapeIds = new Set(countryFeatures().map((f) => String(f.id)));
    for (const id of Object.keys(COUNTRY_NAMES)) expect(shapeIds.has(id), id).toBe(true);
    for (const c of CHOKEPOINTS) {
      for (const id of [...(c.game?.dependents ?? []), ...(c.game?.decoys ?? [])]) {
        expect(id in COUNTRY_NAMES, `${c.id}: ${id}`).toBe(true);
      }
    }
  });

  it("draws sea routes at sea and keeps every route point valid", () => {
    for (const r of Object.values(ALT_ROUTES)) {
      for (const path of r.paths) {
        expect(path.length, r.id).toBeGreaterThanOrEqual(2);
        for (const p of path) {
          expect(validCoord(p), r.id).toBe(true);
          if (r.kind === "sea" && r.id !== "kiel") expect(isOnLand(p), `${r.id} ${p}`).toBe(false);
        }
      }
    }
  });
});

describe("places data", () => {
  it("has a focused list of places with unique ids and names", () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    expect(new Set(PLACES.map((p) => p.name)).size).toBe(PLACES.length);
  });

  it("gives every place valid coordinates, a source per anchor and a sensible tolerance", () => {
    for (const p of PLACES) {
      expect(p.target.length, p.id).toBeGreaterThan(0);
      p.target.forEach((c) => expect(validCoord(c), p.id).toBe(true));
      expect(p.sources.length, p.id).toBeGreaterThan(0);
      p.sources.forEach((s) => expect(validSource(s), p.id).toBe(true));
      expect(p.toleranceKm, p.id).toBeGreaterThanOrEqual(100);
      expect(p.toleranceKm, p.id).toBeLessThanOrEqual(800);
      if (p.kind === "capital") expect(p.country, p.id).toBeTruthy();
    }
  });

  it("says why each place matters, in short plain text with a source", () => {
    for (const p of PLACES) {
      expect(p.why.trim().length, p.id).toBeGreaterThan(20);
      expect(p.why.length, p.id).toBeLessThanOrEqual(180);
      expect(p.why.split(/(?<=\.)\s+/).length, `${p.id}: at most two sentences`).toBeLessThanOrEqual(2);
      expect(p.whySources.length, p.id).toBeGreaterThan(0);
      p.whySources.forEach((s) => expect(validSource(s), p.id).toBe(true));
    }
  });

  it("never names the place in its own note, so the note can be a clue", () => {
    for (const p of PLACES) {
      for (const n of [p.name.replace(/, D\.C\.$/, ""), p.alsoCalled].filter(Boolean) as string[]) {
        expect(p.why.toLowerCase().includes(n.toLowerCase()), `${p.id} names "${n}"`).toBe(false);
      }
    }
  });

  it("dates every note, never in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const p of PLACES) {
      expect(p.checkedOn, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.checkedOn <= today, p.id).toBe(true);
    }
  });

  it("links only real places, never the place itself", () => {
    for (const [id, related] of Object.entries(RELATED_PLACES)) {
      expect(placeById(id), id).toBeTruthy();
      for (const r of related) {
        expect(placeById(r), `${id} -> ${r}`).toBeTruthy();
        expect(r, id).not.toBe(id);
      }
    }
    for (const p of PLACES) expect(RELATED_PLACES[p.id]?.length ?? 0, p.id).toBeGreaterThan(0);
  });

  it("keeps old place ids readable in History", () => {
    expect(placeName("nairobi")).toBe("Nairobi");
    expect(placeName("hanoi")).toBe("Hanoi");
    expect(placeName("no-such-place")).toBe("no-such-place");
  });

  it("asks each place on a map view that shows it", () => {
    for (const p of PLACES) {
      for (const c of p.target) expect(bboxContains(REGIONS[p.region].bbox, c), `${p.id} ${c}`).toBe(true);
    }
  });

  it("covers all five kinds, with easy places of each kind to start", () => {
    for (const kind of ["strait", "capital", "sea", "mountains", "islands"] as const) {
      expect(PLACES.some((p) => p.kind === kind), kind).toBe(true);
    }
    expect(PLACES.filter((p) => p.level === 1).length).toBeGreaterThanOrEqual(15);
  });

  it("puts seas at sea and capitals on land", () => {
    for (const p of PLACES) {
      if (p.kind === "sea") expect(isOnLand(p.target[0]!), p.id).toBe(false);
      if (p.kind === "capital" && p.id !== "singapore") expect(isOnLand(p.target[0]!), p.id).toBe(true);
    }
  });

  it("is written in English only", () => {
    for (const p of PLACES) {
      expect(VIETNAMESE.test(`${p.name} ${p.alsoCalled ?? ""} ${p.why} ${[...p.sources, ...p.whySources].map((s) => s.label).join(" ")}`), p.id).toBe(false);
    }
    for (const c of CHOKEPOINTS) {
      expect(VIETNAMESE.test(JSON.stringify(c)), c.id).toBe(false);
    }
  });
});
