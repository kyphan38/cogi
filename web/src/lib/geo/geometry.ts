import { geoDistance, geoEqualEarth, geoInterpolate, geoPath, type GeoProjection } from "d3-geo";
import type { Bbox } from "@/lib/geo/regions";
import type { LonLat } from "@/lib/geo/types";

/** Mean Earth radius (IUGG), in km. */
export const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in km. */
export function distanceKm(a: LonLat, b: LonLat): number {
  return geoDistance(a, b) * EARTH_RADIUS_KM;
}

/** Sample spacing along a line target; finer than any tolerance in the quiz. */
const LINE_STEP_KM = 10;

/** Distance in km from `p` to a point target, or to the nearest part of a line target. */
export function distanceToTargetKm(p: LonLat, target: LonLat[]): number {
  if (target.length === 1) return distanceKm(p, target[0]!);
  let best = Infinity;
  for (let i = 0; i < target.length - 1; i++) {
    const a = target[i]!;
    const b = target[i + 1]!;
    const steps = Math.max(1, Math.ceil(distanceKm(a, b) / LINE_STEP_KM));
    const at = geoInterpolate(a, b);
    for (let k = 0; k <= steps; k++) {
      best = Math.min(best, distanceKm(p, at(k / steps) as LonLat));
    }
  }
  return best;
}

/** Points spread over a box, used to fit a projection to it. */
function bboxGrid([w, s, e, n]: Bbox): { type: "MultiPoint"; coordinates: LonLat[] } {
  const coordinates: LonLat[] = [];
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 8; j++) {
      const lon = w + ((e - w) * i) / 8;
      coordinates.push([lon > 180 ? lon - 360 : lon, s + ((n - s) * j) / 8]);
    }
  }
  return { type: "MultiPoint", coordinates };
}

/** The map is drawn in this many SVG units across, whatever the screen size. */
export const MAP_WIDTH = 600;

/**
 * An Equal Earth projection centred on the box and fitted to `width`. The height
 * follows the box shape, kept between 45% and 100% of the width so a view is never a
 * thin strip or taller than a phone screen.
 */
export function fitProjection(bbox: Bbox, width = MAP_WIDTH): { projection: GeoProjection; height: number } {
  const [w, , e] = bbox;
  const grid = bboxGrid(bbox);
  const projection = geoEqualEarth().rotate([-(w + e) / 2, 0]);
  projection.fitWidth(width, grid);
  const [[, y0], [, y1]] = geoPath(projection).bounds(grid);
  const natural = Math.round(y1 - y0);
  const height = Math.min(width, Math.max(Math.round(width * 0.45), natural));
  if (height !== natural) projection.fitExtent([[0, 0], [width, height]], grid);
  projection.clipExtent([[0, 0], [width, height]]);
  return { projection, height };
}
