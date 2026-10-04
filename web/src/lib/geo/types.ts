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

/** Wikipedia page used as the source of a coordinate. */
export function wikiSource(page: string): GeoSource {
  const title = WIKI_TITLES[page] ?? page;
  return {
    label: `Wikipedia: ${page} (coordinates)`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}
