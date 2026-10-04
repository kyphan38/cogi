/**
 * Map views for the Geo Lab. A bounding box is [west, south, east, north] in degrees;
 * east may pass 180 (e.g. 200 = 160°W) for views that cross the date line.
 */
export type Bbox = [number, number, number, number];

export type RegionId =
  | "world"
  | "east-asia"
  | "southeast-asia"
  | "west-pacific"
  | "south-asia"
  | "middle-east"
  | "central-asia"
  | "europe"
  | "africa"
  | "north-america"
  | "south-america"
  | "north-pacific"
  | "oceania";

export const REGIONS: Record<RegionId, { label: string; bbox: Bbox }> = {
  world: { label: "World", bbox: [-180, -56, 180, 78] },
  "east-asia": { label: "East Asia", bbox: [98, 15, 150, 50] },
  "southeast-asia": { label: "Southeast Asia", bbox: [88, -12, 132, 25] },
  "west-pacific": { label: "Western Pacific", bbox: [100, -5, 165, 55] },
  "south-asia": { label: "South Asia", bbox: [58, 4, 100, 38] },
  "middle-east": { label: "Middle East", bbox: [22, 8, 66, 46] },
  "central-asia": { label: "Central Asia", bbox: [40, 30, 120, 70] },
  europe: { label: "Europe", bbox: [-12, 34, 42, 66] },
  africa: { label: "Africa", bbox: [-20, -36, 55, 38] },
  "north-america": { label: "North America", bbox: [-130, 5, -55, 60] },
  "south-america": { label: "South America", bbox: [-85, -62, -30, 14] },
  "north-pacific": { label: "North Pacific", bbox: [128, 38, 200, 70] },
  oceania: { label: "Oceania", bbox: [110, -45, 180, -5] },
};

/** True when [lon, lat] lies inside the box (east past 180 handled). */
export function bboxContains(bbox: Bbox, [lon, lat]: [number, number]): boolean {
  const [w, s, e, n] = bbox;
  if (lat < s || lat > n) return false;
  const l = lon < w ? lon + 360 : lon;
  return l >= w && l <= e;
}
