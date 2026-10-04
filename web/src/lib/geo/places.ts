import type { RegionId } from "@/lib/geo/regions";
import { wikiSource, type GeoSource, type LonLat } from "@/lib/geo/types";

/**
 * Places for the daily map quiz (PLAN-geopolitics.md G2). A fixed data set: every
 * coordinate comes from the Wikipedia article named in `sources` and was checked
 * against it on 2026-10-04. Long features (a mountain range, an island chain, a long
 * strait) are a line through several sourced anchor points; a tap counts when it is
 * within `toleranceKm` of the point or the line.
 *
 * Names are the common international names in English. Where another name is widely
 * used, `alsoCalled` gives it, so the quiz takes no side on any naming dispute.
 */

export type PlaceKind = "strait" | "capital" | "sea" | "mountains" | "islands";

export interface Place {
  id: string;
  name: string;
  alsoCalled?: string;
  kind: PlaceKind;
  /** Capitals: the country, shown in the question. */
  country?: string;
  /** The map view the question is asked on. */
  region: RegionId;
  /** 1 = widely known, 3 = harder. New places come easy first. */
  level: 1 | 2 | 3;
  /** One point, or a line through several points. */
  target: LonLat[];
  toleranceKm: number;
  sources: GeoSource[];
}

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  strait: "Strait or canal",
  capital: "Capital city",
  sea: "Sea or gulf",
  mountains: "Mountains",
  islands: "Islands",
};

type Spec = Omit<Place, "sources" | "target"> & { target: LonLat | LonLat[]; pages: string[] };

function isLine(t: LonLat | LonLat[]): t is LonLat[] {
  return Array.isArray(t[0]);
}

function place(spec: Spec): Place {
  const { pages, target, ...rest } = spec;
  return { ...rest, target: isLine(target) ? target : [target], sources: pages.map(wikiSource) };
}

const strait = (id: string, name: string, region: RegionId, level: Place["level"], target: Spec["target"], toleranceKm: number, pages: string[]) =>
  place({ id, name, kind: "strait", region, level, target, toleranceKm, pages });

const capital = (id: string, name: string, country: string, region: RegionId, level: Place["level"], target: LonLat, toleranceKm: number) =>
  place({ id, name, country, kind: "capital", region, level, target, toleranceKm, pages: [name] });

const sea = (id: string, name: string, region: RegionId, level: Place["level"], target: LonLat, toleranceKm: number, alsoCalled?: string) =>
  place({ id, name, alsoCalled, kind: "sea", region, level, target, toleranceKm, pages: [name] });

const mountains = (id: string, name: string, region: RegionId, level: Place["level"], target: Spec["target"], toleranceKm: number, pages: string[]) =>
  place({ id, name, kind: "mountains", region, level, target, toleranceKm, pages });

const islands = (id: string, name: string, region: RegionId, level: Place["level"], target: Spec["target"], toleranceKm: number, pages: string[]) =>
  place({ id, name, kind: "islands", region, level, target, toleranceKm, pages });

// Anchor points reused by several lines (Wikipedia coordinates).
const SHUMSHU: LonLat = [156.32, 50.73];
const KUNASHIR: LonLat = [145.85, 44.12];
const HOKKAIDO: LonLat = [142, 43];
const KYUSHU: LonLat = [131, 33];
const TANEGASHIMA: LonLat = [130.98, 30.57];
const OKINAWA: LonLat = [127.93, 26.48];
const YONAGUNI: LonLat = [122.99, 24.46];

export const PLACES: Place[] = [
  // Straits and canals
  strait("hormuz", "Strait of Hormuz", "middle-east", 1, [56.5, 26.6], 200, ["Strait of Hormuz"]),
  strait("malacca", "Strait of Malacca", "southeast-asia", 1, [[96.87, 6.71], [103.52, 1.27]], 150, ["Strait of Malacca"]),
  strait("bab-el-mandeb", "Bab el-Mandeb", "middle-east", 2, [43.33, 12.58], 200, ["Bab al-Mandab Strait"]),
  strait("bosporus", "Bosporus", "europe", 2, [29.08, 41.12], 150, ["Bosporus"]),
  strait("dardanelles", "Dardanelles", "europe", 3, [26.4, 40.2], 150, ["Dardanelles"]),
  strait("gibraltar", "Strait of Gibraltar", "europe", 1, [-5.5, 35.95], 200, ["Strait of Gibraltar"]),
  strait("dover", "Strait of Dover", "europe", 2, [1.5, 51], 150, ["Strait of Dover"]),
  strait("taiwan-strait", "Taiwan Strait", "east-asia", 2, [119.93, 24.81], 200, ["Taiwan Strait"]),
  strait("korea-strait", "Korea Strait", "east-asia", 3, [129.8, 34.6], 200, ["Korea Strait"]),
  strait("lombok", "Lombok Strait", "southeast-asia", 3, [115.73, -8.77], 150, ["Lombok Strait"]),
  strait("sunda", "Sunda Strait", "southeast-asia", 3, [105.88, -5.92], 150, ["Sunda Strait"]),
  strait("luzon-strait", "Luzon Strait", "east-asia", 3, [121, 21], 200, ["Luzon Strait"]),
  strait("magellan", "Strait of Magellan", "south-america", 2, [-71, -54], 250, ["Strait of Magellan"]),
  strait("bering", "Bering Strait", "north-pacific", 2, [-168.98, 65.75], 250, ["Bering Strait"]),
  strait("mozambique-channel", "Mozambique Channel", "africa", 2, [41, -18], 300, ["Mozambique Channel"]),
  strait("drake", "Drake Passage", "south-america", 3, [-65.9, -58.58], 300, ["Drake Passage"]),
  strait("palk", "Palk Strait", "south-asia", 3, [79.75, 10], 150, ["Palk Strait"]),
  strait("suez-canal", "Suez Canal", "middle-east", 1, [32.34, 30.71], 150, ["Suez Canal"]),
  strait("panama-canal", "Panama Canal", "north-america", 1, [-79.75, 9.12], 200, ["Panama Canal"]),
  strait("kiel-canal", "Kiel Canal", "europe", 3, [9.13, 53.88], 150, ["Kiel Canal"]),
  strait("danish-straits", "Danish Straits", "europe", 2, [11, 56], 200, ["Danish Straits"]),

  // Capital cities
  capital("hanoi", "Hanoi", "Vietnam", "southeast-asia", 1, [105.85, 21], 150),
  capital("beijing", "Beijing", "China", "east-asia", 1, [116.4, 39.91], 150),
  capital("tokyo", "Tokyo", "Japan", "east-asia", 1, [139.69, 35.69], 150),
  capital("seoul", "Seoul", "South Korea", "east-asia", 1, [126.99, 37.56], 100),
  capital("pyongyang", "Pyongyang", "North Korea", "east-asia", 2, [125.75, 39.02], 100),
  capital("manila", "Manila", "the Philippines", "southeast-asia", 1, [120.98, 14.6], 150),
  capital("jakarta", "Jakarta", "Indonesia", "southeast-asia", 1, [106.83, -6.18], 150),
  capital("bangkok", "Bangkok", "Thailand", "southeast-asia", 1, [100.49, 13.75], 150),
  capital("kuala-lumpur", "Kuala Lumpur", "Malaysia", "southeast-asia", 2, [101.7, 3.15], 150),
  capital("singapore", "Singapore", "Singapore", "southeast-asia", 1, [103.83, 1.28], 120),
  capital("naypyidaw", "Naypyidaw", "Myanmar", "southeast-asia", 3, [96.12, 19.75], 150),
  capital("phnom-penh", "Phnom Penh", "Cambodia", "southeast-asia", 2, [104.92, 11.57], 150),
  capital("vientiane", "Vientiane", "Laos", "southeast-asia", 2, [102.63, 17.98], 150),
  capital("new-delhi", "New Delhi", "India", "south-asia", 1, [77.21, 28.61], 150),
  capital("islamabad", "Islamabad", "Pakistan", "south-asia", 2, [73.06, 33.69], 150),
  capital("kabul", "Kabul", "Afghanistan", "south-asia", 2, [69.18, 34.53], 150),
  capital("dhaka", "Dhaka", "Bangladesh", "south-asia", 2, [90.39, 23.76], 150),
  capital("tehran", "Tehran", "Iran", "middle-east", 1, [51.39, 35.69], 200),
  capital("riyadh", "Riyadh", "Saudi Arabia", "middle-east", 2, [46.72, 24.63], 200),
  capital("baghdad", "Baghdad", "Iraq", "middle-east", 2, [44.37, 33.32], 200),
  capital("ankara", "Ankara", "Türkiye", "middle-east", 2, [32.85, 39.93], 200),
  capital("cairo", "Cairo", "Egypt", "middle-east", 1, [31.24, 30.04], 150),
  capital("moscow", "Moscow", "Russia", "europe", 1, [37.62, 55.76], 200),
  capital("kyiv", "Kyiv", "Ukraine", "europe", 1, [30.52, 50.45], 200),
  capital("warsaw", "Warsaw", "Poland", "europe", 2, [21.01, 52.23], 200),
  capital("berlin", "Berlin", "Germany", "europe", 1, [13.4, 52.52], 200),
  capital("paris", "Paris", "France", "europe", 1, [2.35, 48.86], 150),
  capital("london", "London", "the United Kingdom", "europe", 1, [-0.13, 51.51], 150),
  capital("brussels", "Brussels", "Belgium", "europe", 3, [4.35, 50.85], 120),
  capital("washington", "Washington, D.C.", "the United States", "north-america", 1, [-77.02, 38.9], 200),
  capital("ottawa", "Ottawa", "Canada", "north-america", 2, [-75.7, 45.42], 200),
  capital("mexico-city", "Mexico City", "Mexico", "north-america", 1, [-99.13, 19.43], 200),
  capital("brasilia", "Brasília", "Brazil", "south-america", 2, [-47.88, -15.79], 250),
  capital("canberra", "Canberra", "Australia", "oceania", 2, [149.13, -35.29], 200),
  capital("abuja", "Abuja", "Nigeria", "africa", 3, [7.48, 9.07], 250),
  capital("addis-ababa", "Addis Ababa", "Ethiopia", "africa", 2, [38.75, 9.04], 250),
  capital("nairobi", "Nairobi", "Kenya", "africa", 2, [36.82, -1.29], 250),
  capital("ulaanbaatar", "Ulaanbaatar", "Mongolia", "central-asia", 2, [106.92, 47.92], 250),
  capital("astana", "Astana", "Kazakhstan", "central-asia", 3, [71.43, 51.13], 250),

  // Seas and gulfs. A tap on land never counts for these.
  sea("south-china-sea", "South China Sea", "southeast-asia", 1, [113, 12], 600, "the East Sea in Vietnam, and the West Philippine Sea in the Philippines"),
  sea("east-china-sea", "East China Sea", "east-asia", 2, [125, 30], 400),
  sea("sea-of-japan", "Sea of Japan", "east-asia", 2, [135, 40], 450, "the East Sea in Korea"),
  sea("yellow-sea", "Yellow Sea", "east-asia", 2, [123, 38], 350),
  sea("philippine-sea", "Philippine Sea", "east-asia", 2, [130, 20], 700),
  sea("persian-gulf", "Persian Gulf", "middle-east", 1, [52, 26], 350, "the Arabian Gulf"),
  sea("red-sea", "Red Sea", "middle-east", 1, [38, 22], 500),
  sea("arabian-sea", "Arabian Sea", "south-asia", 1, [65, 14], 700),
  sea("bay-of-bengal", "Bay of Bengal", "south-asia", 1, [88, 15], 500),
  sea("mediterranean", "Mediterranean Sea", "europe", 1, [18, 35], 800),
  sea("black-sea", "Black Sea", "europe", 1, [35, 44], 350),
  sea("baltic-sea", "Baltic Sea", "europe", 1, [20, 58], 400),
  sea("north-sea", "North Sea", "europe", 2, [3, 56], 350),
  sea("caspian-sea", "Caspian Sea", "central-asia", 2, [50.5, 42], 350),
  sea("gulf-of-aden", "Gulf of Aden", "middle-east", 2, [48, 12], 300),
  sea("andaman-sea", "Andaman Sea", "southeast-asia", 2, [96, 10], 350),
  sea("gulf-of-thailand", "Gulf of Thailand", "southeast-asia", 2, [102, 9.5], 300),
  sea("sea-of-okhotsk", "Sea of Okhotsk", "north-pacific", 3, [150, 55], 600),
  sea("caribbean-sea", "Caribbean Sea", "north-america", 1, [-75, 15], 700),
  sea("coral-sea", "Coral Sea", "oceania", 3, [158, -18], 600),

  // Mountains
  mountains("himalayas", "Himalayas", "south-asia", 1, [[74.59, 35.24], [86.93, 27.99], [95.06, 29.63]], 250, ["Nanga Parbat", "Mount Everest", "Namcha Barwa"]),
  mountains(
    "andes",
    "Andes",
    "south-america",
    1,
    [[-71.05, 8.54], [-78.82, -1.47], [-77.6, -9.12], [-67.79, -16.63], [-68.54, -27.11], [-70.01, -32.65], [-73.04, -49.27]],
    300,
    ["Pico Bolívar", "Chimborazo", "Huascarán", "Illimani", "Ojos del Salado", "Aconcagua", "Fitz Roy"],
  ),
  mountains("alps", "Alps", "europe", 1, [8.62, 46.58], 300, ["Alps"]),
  mountains("urals", "Ural Mountains", "central-asia", 2, [[60.12, 65.03], [58.1, 54.26]], 300, ["Mount Narodnaya", "Mount Yamantau"]),
  mountains(
    "rockies",
    "Rocky Mountains",
    "north-america",
    1,
    [[-119.16, 53.11], [-110.8, 43.74], [-106.45, 39.12], [-105.42, 36.56]],
    300,
    ["Mount Robson", "Grand Teton", "Mount Elbert", "Wheeler Peak (New Mexico)"],
  ),
  mountains("zagros", "Zagros Mountains", "middle-east", 2, [47, 33.67], 400, ["Zagros Mountains"]),
  mountains("caucasus", "Caucasus Mountains", "middle-east", 2, [45, 42.5], 300, ["Caucasus Mountains"]),
  mountains("hindu-kush", "Hindu Kush", "south-asia", 2, [71, 35], 300, ["Hindu Kush"]),
  mountains("atlas", "Atlas Mountains", "africa", 2, [-7.92, 31.06], 400, ["Atlas Mountains"]),
  mountains("annamites", "Annamite Range", "southeast-asia", 2, [[103.8, 18.59], [107.87, 16.2], [107.98, 15.07]], 200, ["Annamite Range", "Bach Ma National Park", "Ngoc Linh"]),
  mountains("carpathians", "Carpathian Mountains", "europe", 2, [25.5, 47], 350, ["Carpathian Mountains"]),
  mountains("tian-shan", "Tian Shan", "central-asia", 3, [80, 42], 400, ["Tian Shan"]),

  // Islands and island chains
  islands(
    "first-island-chain",
    "First island chain",
    "west-pacific",
    2,
    [SHUMSHU, KUNASHIR, HOKKAIDO, KYUSHU, TANEGASHIMA, OKINAWA, YONAGUNI, [121, 16], [118.83, 10], [114, 0]],
    300,
    ["Island chain strategy", "Shumshu", "Kunashir", "Hokkaido", "Kyushu", "Tanegashima", "Okinawa Island", "Yonaguni", "Luzon", "Palawan", "Borneo"],
  ),
  islands("spratly", "Spratly Islands", "southeast-asia", 1, [114, 10], 250, ["Spratly Islands"]),
  islands("paracel", "Paracel Islands", "southeast-asia", 2, [112.33, 16.67], 200, ["Paracel Islands"]),
  islands("ryukyu", "Ryukyu Islands", "east-asia", 2, [TANEGASHIMA, OKINAWA, YONAGUNI], 200, ["Tanegashima", "Okinawa Island", "Yonaguni"]),
  islands("kuril", "Kuril Islands", "north-pacific", 3, [SHUMSHU, KUNASHIR], 200, ["Shumshu", "Kunashir"]),
  islands("aleutian", "Aleutian Islands", "north-pacific", 3, [[-164.19, 54.77], [-174.2, 52.2], [172.91, 52.9]], 200, ["Unimak Island", "Aleutian Islands", "Attu Island"]),
  islands("andaman-nicobar", "Andaman and Nicobar Islands", "southeast-asia", 3, [92.72, 11.68], 300, ["Andaman and Nicobar Islands"]),
];

export function placeById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

/** Names said without "the". */
const NO_ARTICLE = new Set(["bab-el-mandeb"]);

/** "Tap Hanoi, the capital of Vietnam." / "Tap the Strait of Hormuz." */
export function placeQuestion(p: Place): string {
  if (p.kind === "capital" && p.country) return `Tap ${p.name}, the capital of ${p.country}.`;
  if (NO_ARTICLE.has(p.id)) return `Tap ${p.name}.`;
  const name = p.id === "first-island-chain" ? p.name.toLowerCase() : p.name;
  return `Tap the ${name}.`;
}
