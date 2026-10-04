/**
 * English names for the countries the Geo Lab asks about, keyed by the ISO 3166-1
 * numeric code that `world-atlas` uses as each shape's id. Only these countries get
 * a name on the map; every other shape is drawn without a label, so the map never
 * names a disputed area (PLAN-geopolitics.md G2).
 */
export const COUNTRY_NAMES = {
  "031": "Azerbaijan",
  "036": "Australia",
  "076": "Brazil",
  "124": "Canada",
  "152": "Chile",
  "156": "China",
  "246": "Finland",
  "276": "Germany",
  "300": "Greece",
  "356": "India",
  "364": "Iran",
  "380": "Italy",
  "392": "Japan",
  "398": "Kazakhstan",
  "410": "South Korea",
  "484": "Mexico",
  "566": "Nigeria",
  "616": "Poland",
  "620": "Portugal",
  "643": "Russia",
  "682": "Saudi Arabia",
  "724": "Spain",
  "804": "Ukraine",
  "818": "Egypt",
  "840": "United States",
} as const;

export type CountryId = keyof typeof COUNTRY_NAMES;

export function countryName(id: string): string | undefined {
  return (COUNTRY_NAMES as Record<string, string>)[id];
}
