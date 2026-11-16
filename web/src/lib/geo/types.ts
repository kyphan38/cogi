/** [longitude, latitude] in degrees, the order d3-geo and GeoJSON use. */
export type LonLat = [number, number];

/** Where a fact comes from. Every fixed geo fact carries one (PLAN-geopolitics.md G2). */
export interface GeoSource {
  label: string;
  url: string;
}

/**
 * Pages whose English Wikipedia title uses Vietnamese letters. The label stays in
 * plain letters (the app is English-only); the link still opens the real page.
 */
const WIKI_TITLES: Record<string, string> = {
  "Bach Ma National Park": "Bạch Mã National Park",
  "Ngoc Linh": "Ngọc Linh",
};

const wikiUrl = (page: string) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent((WIKI_TITLES[page] ?? page).replace(/ /g, "_"))}`;

/** Wikipedia page used as the source of a coordinate. */
export function wikiSource(page: string): GeoSource {
  return { label: `Wikipedia: ${page} (coordinates)`, url: wikiUrl(page) };
}

/** Wikipedia page used as the source of a fact. */
export function wikiFact(page: string): GeoSource {
  return { label: `Wikipedia: ${page}`, url: wikiUrl(page) };
}
