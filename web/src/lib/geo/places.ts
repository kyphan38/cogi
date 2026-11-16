import { chokepointById, type ChokepointId } from "@/lib/geo/chokepoints";
import type { RegionId } from "@/lib/geo/regions";
import { wikiFact, wikiSource, type GeoSource, type LonLat } from "@/lib/geo/types";

/**
 * Places for the daily map quiz (PLAN-geopolitics.md G2). A fixed data set: every
 * coordinate comes from the Wikipedia article named in `sources` and was checked
 * against it on 2026-10-04. Long features (a mountain range, an island chain, a long
 * strait) are a line through several sourced anchor points; a tap counts when it is
 * within `toleranceKm` of the point or the line.
 *
 * Only places that matter in today's news are in the list (cut from 98 to 50 on
 * 2026-11-15). Each one has a short "why it matters" note; every claim in a note was
 * checked against the articles in `whySources` on 2026-11-15.
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
  /**
   * One or two plain sentences on why the place matters today. Never names the place
   * itself, so it can also be the clue in a "by role" question.
   */
  why: string;
  whySources: GeoSource[];
  /** Day the note was last checked against its sources, "YYYY-MM-DD". */
  checkedOn: string;
}

/**
 * Day every "why" note was last checked. News moves fast (wars, attacks on ships):
 * re-check the notes at least once a year and update this date.
 */
export const NOTES_CHECKED_ON = "2026-11-15";

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  strait: "Strait or canal",
  capital: "Capital city",
  sea: "Sea or gulf",
  mountains: "Mountains",
  islands: "Islands",
};

/** Why a place matters, and where that comes from. */
interface Note {
  why: string;
  from: GeoSource[];
}

const note = (why: string, ...pages: string[]): Note => ({ why, from: pages.map(wikiFact) });

/** Reuse the sourced "why" of a chokepoint, so the quiz and "Close the strait" agree. */
function chokepointNote(id: ChokepointId): Note {
  const c = chokepointById(id)!;
  return { why: c.why, from: [c.facts[0]?.source ?? c.coordsSource] };
}

type Spec = Omit<Place, "sources" | "target" | "why" | "whySources" | "checkedOn"> & { target: LonLat | LonLat[]; pages: string[]; note: Note };

function isLine(t: LonLat | LonLat[]): t is LonLat[] {
  return Array.isArray(t[0]);
}

function place(spec: Spec): Place {
  const { pages, target, note: n, ...rest } = spec;
  return { ...rest, target: isLine(target) ? target : [target], sources: pages.map(wikiSource), why: n.why, whySources: n.from, checkedOn: NOTES_CHECKED_ON };
}

const strait = (id: string, name: string, region: RegionId, level: Place["level"], target: Spec["target"], toleranceKm: number, pages: string[], n: Note) =>
  place({ id, name, kind: "strait", region, level, target, toleranceKm, pages, note: n });

const capital = (id: string, name: string, country: string, region: RegionId, level: Place["level"], target: LonLat, toleranceKm: number, n: Note) =>
  place({ id, name, country, kind: "capital", region, level, target, toleranceKm, pages: [name], note: n });

const sea = (id: string, name: string, region: RegionId, level: Place["level"], target: LonLat, toleranceKm: number, n: Note, alsoCalled?: string) =>
  place({ id, name, alsoCalled, kind: "sea", region, level, target, toleranceKm, pages: [name], note: n });

const mountains = (id: string, name: string, region: RegionId, level: Place["level"], target: Spec["target"], toleranceKm: number, pages: string[], n: Note) =>
  place({ id, name, kind: "mountains", region, level, target, toleranceKm, pages, note: n });

const islands = (id: string, name: string, region: RegionId, level: Place["level"], target: Spec["target"], toleranceKm: number, pages: string[], n: Note) =>
  place({ id, name, kind: "islands", region, level, target, toleranceKm, pages, note: n });

// Anchor points reused by several lines (Wikipedia coordinates).
const SHUMSHU: LonLat = [156.32, 50.73];
const KUNASHIR: LonLat = [145.85, 44.12];
const HOKKAIDO: LonLat = [142, 43];
const KYUSHU: LonLat = [131, 33];
const TANEGASHIMA: LonLat = [130.98, 30.57];
const OKINAWA: LonLat = [127.93, 26.48];
const YONAGUNI: LonLat = [122.99, 24.46];

const NUCLEAR_KOREA = "North Korea and weapons of mass destruction";

export const PLACES: Place[] = [
  // Straits and canals
  strait("hormuz", "Strait of Hormuz", "middle-east", 1, [56.5, 26.6], 200, ["Strait of Hormuz"], chokepointNote("hormuz")),
  strait("malacca", "Strait of Malacca", "southeast-asia", 1, [[96.87, 6.71], [103.52, 1.27]], 150, ["Strait of Malacca"], chokepointNote("malacca")),
  strait("bab-el-mandeb", "Bab el-Mandeb", "middle-east", 2, [43.33, 12.58], 200, ["Bab al-Mandab Strait"], chokepointNote("bab-el-mandeb")),
  strait("bosporus", "Bosporus", "europe", 2, [29.08, 41.12], 150, ["Bosporus"], chokepointNote("turkish-straits")),
  strait("gibraltar", "Strait of Gibraltar", "europe", 1, [-5.5, 35.95], 200, ["Strait of Gibraltar"], chokepointNote("gibraltar")),
  strait("suez-canal", "Suez Canal", "middle-east", 1, [32.34, 30.71], 150, ["Suez Canal"], chokepointNote("suez")),
  strait("panama-canal", "Panama Canal", "north-america", 1, [-79.75, 9.12], 200, ["Panama Canal"], chokepointNote("panama")),
  strait("danish-straits", "Danish Straits", "europe", 2, [11, 56], 200, ["Danish Straits"], chokepointNote("danish-straits")),
  strait("dover", "Strait of Dover", "europe", 2, [1.5, 51], 150, ["Strait of Dover"],
    note("One of the busiest sea lanes in the world, between England and France. Over 400 cargo ships pass it every day.", "Strait of Dover")),
  strait("taiwan-strait", "Taiwan Strait", "east-asia", 2, [119.93, 24.81], 200, ["Taiwan Strait"],
    note("The sea between Taiwan and mainland China, 126 km wide at its narrowest. China has held large military drills around Taiwan since 2022.", "Taiwan Strait")),
  strait("luzon-strait", "Luzon Strait", "east-asia", 3, [121, 21], 200, ["Luzon Strait"],
    note("Between Taiwan and the Philippines, linking the Pacific to the South China Sea. Many undersea data cables for East Asia pass here.", "Luzon Strait")),
  strait("lombok", "Lombok Strait", "southeast-asia", 3, [115.73, -8.77], 150, ["Lombok Strait"],
    note("Much deeper than the Strait of Malacca. Ships too big for Malacca often go this way instead.", "Lombok Strait")),
  strait("bering", "Bering Strait", "north-pacific", 2, [-168.98, 65.75], 250, ["Bering Strait"],
    note("The only sea link between the Pacific and the Arctic. Here Russia and the US are just 3.8 km apart, on two small islands.", "Bering Strait")),

  // Capital cities: only countries that shape world news.
  capital("washington", "Washington, D.C.", "the United States", "north-america", 1, [-77.02, 38.9], 200,
    note("Capital of the United States, the largest economy in the world since about 1890. It pays for nearly a third of all military spending in the world.", "United States")),
  capital("beijing", "Beijing", "China", "east-asia", 1, [116.4, 39.91], 150,
    note("Capital of China, the world's largest manufacturer and second-largest economy.", "China")),
  capital("moscow", "Moscow", "Russia", "europe", 1, [37.62, 55.76], 200,
    note("Capital of Russia, which has the largest stock of nuclear weapons. Russia started a full-scale invasion of Ukraine in 2022.", "Russia")),
  capital("kyiv", "Kyiv", "Ukraine", "europe", 1, [30.52, 50.45], 200,
    note("Capital of Ukraine. Russia's invasion in 2022 started the largest and deadliest war in Europe since World War II.", "Russian invasion of Ukraine")),
  capital("brussels", "Brussels", "Belgium", "europe", 2, [4.35, 50.85], 120,
    note("Home of the main EU institutions and of NATO headquarters.", "Brussels")),
  capital("berlin", "Berlin", "Germany", "europe", 1, [13.4, 52.52], 200,
    note("Capital of Germany, the largest economy in Europe and the EU country with the most people.", "Germany")),
  capital("paris", "Paris", "France", "europe", 1, [2.35, 48.86], 150,
    note("Capital of France, which has nuclear weapons and a permanent seat on the UN Security Council.", "France")),
  capital("london", "London", "the United Kingdom", "europe", 1, [-0.13, 51.51], 150,
    note("Capital of the United Kingdom, a nuclear power and NATO member with a permanent seat on the UN Security Council.", "United Kingdom")),
  capital("warsaw", "Warsaw", "Poland", "europe", 2, [21.01, 52.23], 200,
    note("Capital of Poland, a NATO and EU member. Poland borders Ukraine, Belarus and Russia.", "Poland")),
  capital("ankara", "Ankara", "Türkiye", "middle-east", 2, [32.85, 39.93], 200,
    note("Capital of Türkiye, a NATO member since 1952. Türkiye holds the Bosporus, the only sea way out of the Black Sea.", "Turkey", "Bosporus")),
  capital("tehran", "Tehran", "Iran", "middle-east", 1, [51.39, 35.69], 200,
    note("Capital of Iran, which sits on the Strait of Hormuz. Its nuclear program is one of the most watched in the world.", "Iran")),
  capital("riyadh", "Riyadh", "Saudi Arabia", "middle-east", 2, [46.72, 24.63], 200,
    note("Capital of Saudi Arabia, the world's leading oil exporter. It has the second-largest oil reserves.", "Saudi Arabia")),
  capital("cairo", "Cairo", "Egypt", "middle-east", 1, [31.24, 30.04], 150,
    note("Capital of Egypt, the Arab country with the most people. Egypt runs the Suez Canal.", "Egypt", "Suez Canal")),
  capital("new-delhi", "New Delhi", "India", "south-asia", 1, [77.21, 28.61], 150,
    note("Capital of India, the country with the most people in the world.", "India")),
  capital("islamabad", "Islamabad", "Pakistan", "south-asia", 2, [73.06, 33.69], 150,
    note("Capital of Pakistan, which has nuclear weapons. Pakistan and India have fought three wars over Kashmir.", "Pakistan", "Kashmir conflict")),
  capital("tokyo", "Tokyo", "Japan", "east-asia", 1, [139.69, 35.69], 150,
    note("Capital of Japan, a close US ally. About 55,000 US troops are based in Japan.", "United States Forces Japan")),
  capital("seoul", "Seoul", "South Korea", "east-asia", 1, [126.99, 37.56], 100,
    note("Capital of South Korea. It lies close to North Korea, which has tested nuclear weapons six times.", NUCLEAR_KOREA)),
  capital("pyongyang", "Pyongyang", "North Korea", "east-asia", 2, [125.75, 39.02], 100,
    note("Capital of North Korea, the only country to test nuclear weapons this century. It did six tests from 2006 to 2017.", NUCLEAR_KOREA)),
  capital("manila", "Manila", "the Philippines", "southeast-asia", 1, [120.98, 14.6], 150,
    note("Capital of the Philippines, a US treaty ally since 1951. Its disputes with China in the South China Sea have grown.", "Mutual Defense Treaty (United States–Philippines)", "Philippines")),
  capital("hanoi", "Hanoi", "Vietnam", "southeast-asia", 1, [105.85, 21], 150,
    note("Capital of Vietnam. Vietnam holds islands in the Spratlys and claims the Paracels, which China controls.", "Spratly Islands", "Paracel Islands")),
  capital("singapore", "Singapore", "Singapore", "southeast-asia", 1, [103.83, 1.28], 120,
    note("A city-state at the south end of the Strait of Malacca. Its port moves a fifth of the world's shipping containers between ships.", "Port of Singapore")),

  // Seas and gulfs. A tap on land never counts for these.
  sea("south-china-sea", "South China Sea", "southeast-asia", 1, [113, 12], 600,
    note("Several countries claim islands and reefs here. About a fifth of world sea trade by value passed through it in 2016.", "South China Sea"),
    "the East Sea in Vietnam, and the West Philippine Sea in the Philippines"),
  sea("east-china-sea", "East China Sea", "east-asia", 2, [125, 30], 400,
    note("Japan runs the small Senkaku Islands here, but China and Taiwan also claim them (Diaoyu Islands in Chinese).", "Senkaku Islands dispute")),
  sea("persian-gulf", "Persian Gulf", "middle-east", 1, [52, 26], 350,
    { why: "Its only sea way out is the Strait of Hormuz, where about a fifth of the oil the world uses passes.", from: chokepointNote("hormuz").from },
    "the Arabian Gulf"),
  sea("red-sea", "Red Sea", "middle-east", 1, [38, 22], 500,
    note("Links the Suez Canal to the Indian Ocean. Houthi attacks on ships since 2023 made hundreds of ships sail around Africa instead.", "Red Sea crisis")),
  sea("gulf-of-aden", "Gulf of Aden", "middle-east", 2, [48, 12], 300,
    note("Between Yemen and Somalia, on the way to the Red Sea. A pirate hub in the 2000s; since 2023, navies have guarded ships here against Houthi attacks.", "Gulf of Aden", "Red Sea crisis")),
  sea("mediterranean", "Mediterranean Sea", "europe", 1, [18, 35], 800,
    note("Links Europe, Africa and the Middle East, and leads to the Suez Canal. Many migrants have drowned here trying to reach Europe.", "Mediterranean Sea")),
  sea("black-sea", "Black Sea", "europe", 1, [35, 44], 350,
    note("Russia and Ukraine both have coasts here. The 2022 war stopped Ukraine's grain ships for a time, and world food prices rose.", "Black Sea Grain Initiative")),
  sea("baltic-sea", "Baltic Sea", "europe", 1, [20, 58], 400,
    note("Nine countries border it. Since Finland and Sweden joined NATO, Russia is the only one outside NATO.", "Baltic Sea", "Member states of NATO")),

  // Mountains
  mountains("himalayas", "Himalayas", "south-asia", 1, [[74.59, 35.24], [86.93, 27.99], [95.06, 29.63]], 250, ["Nanga Parbat", "Mount Everest", "Namcha Barwa"],
    note("India and China share a long, disputed border here. Soldiers from both sides died in a clash in the Galwan Valley in 2020.", "2020–2021 China–India skirmishes")),

  // Islands and island chains
  islands("taiwan", "Taiwan", "east-asia", 1, [121, 23.77], 150, ["Taiwan (island)"],
    note("A self-governed island that China claims as its own. Chips and other AI gear make up about 80% of its exports.", "Political status of Taiwan", "Taiwan")),
  islands(
    "first-island-chain",
    "First island chain",
    "west-pacific",
    2,
    [SHUMSHU, KUNASHIR, HOKKAIDO, KYUSHU, TANEGASHIMA, OKINAWA, YONAGUNI, [121, 16], [118.83, 10], [114, 0]],
    300,
    ["Island chain strategy", "Shumshu", "Kunashir", "Hokkaido", "Kyushu", "Tanegashima", "Okinawa Island", "Yonaguni", "Luzon", "Palawan", "Borneo"],
    note("A US plan from 1951 to ring China with bases on these islands. Taiwan is at its centre, so both the US and China watch it closely.", "Island chain strategy"),
  ),
  islands("spratly", "Spratly Islands", "southeast-asia", 1, [114, 10], 250, ["Spratly Islands"],
    note("China, Taiwan, Vietnam, the Philippines and Malaysia all keep forces on reefs here. China has turned some reefs into military bases.", "Spratly Islands")),
  islands("paracel", "Paracel Islands", "southeast-asia", 2, [112.33, 16.67], 200, ["Paracel Islands"],
    note("China has controlled them since a battle in 1974. Vietnam and Taiwan still claim them.", "Paracel Islands")),
  islands("ryukyu", "Ryukyu Islands", "east-asia", 2, [TANEGASHIMA, OKINAWA, YONAGUNI], 200, ["Tanegashima", "Okinawa Island", "Yonaguni"],
    note("Japanese islands that run toward Taiwan. Okinawa has about 70% of the land used only by US forces in Japan.", "Okinawa Prefecture")),
  islands("kuril", "Kuril Islands", "north-pacific", 3, [SHUMSHU, KUNASHIR], 200, ["Shumshu", "Kunashir"],
    note("Russia holds the four southern islands, which Japan claims. So the two countries never signed a peace treaty after World War II.", "Kuril Islands dispute")),
];

/**
 * Places taken out of the quiz on 2026-11-15. Kept by name only, so old quiz rows in
 * History still show a name instead of an id.
 */
const RETIRED_PLACE_NAMES: Record<string, string> = {
  dardanelles: "Dardanelles",
  "korea-strait": "Korea Strait",
  sunda: "Sunda Strait",
  magellan: "Strait of Magellan",
  "mozambique-channel": "Mozambique Channel",
  drake: "Drake Passage",
  palk: "Palk Strait",
  "kiel-canal": "Kiel Canal",
  jakarta: "Jakarta",
  bangkok: "Bangkok",
  "kuala-lumpur": "Kuala Lumpur",
  naypyidaw: "Naypyidaw",
  "phnom-penh": "Phnom Penh",
  vientiane: "Vientiane",
  kabul: "Kabul",
  dhaka: "Dhaka",
  baghdad: "Baghdad",
  ottawa: "Ottawa",
  "mexico-city": "Mexico City",
  brasilia: "Brasília",
  canberra: "Canberra",
  abuja: "Abuja",
  "addis-ababa": "Addis Ababa",
  nairobi: "Nairobi",
  ulaanbaatar: "Ulaanbaatar",
  astana: "Astana",
  "sea-of-japan": "Sea of Japan",
  "yellow-sea": "Yellow Sea",
  "philippine-sea": "Philippine Sea",
  "arabian-sea": "Arabian Sea",
  "bay-of-bengal": "Bay of Bengal",
  "north-sea": "North Sea",
  "caspian-sea": "Caspian Sea",
  "andaman-sea": "Andaman Sea",
  "gulf-of-thailand": "Gulf of Thailand",
  "sea-of-okhotsk": "Sea of Okhotsk",
  "caribbean-sea": "Caribbean Sea",
  "coral-sea": "Coral Sea",
  andes: "Andes",
  alps: "Alps",
  urals: "Ural Mountains",
  rockies: "Rocky Mountains",
  zagros: "Zagros Mountains",
  caucasus: "Caucasus Mountains",
  "hindu-kush": "Hindu Kush",
  atlas: "Atlas Mountains",
  annamites: "Annamite Range",
  carpathians: "Carpathian Mountains",
  "tian-shan": "Tian Shan",
  aleutian: "Aleutian Islands",
  "andaman-nicobar": "Andaman and Nicobar Islands",
};

/**
 * Places that belong together in the news (a strait and the sea behind it, a capital
 * and its disputed islands). Shown after an answer, so places are learned in groups.
 */
export const RELATED_PLACES: Record<string, string[]> = {
  hormuz: ["persian-gulf", "tehran", "riyadh"],
  malacca: ["singapore", "lombok", "south-china-sea"],
  "bab-el-mandeb": ["red-sea", "gulf-of-aden"],
  bosporus: ["black-sea", "ankara"],
  gibraltar: ["mediterranean"],
  "suez-canal": ["red-sea", "mediterranean", "cairo"],
  "panama-canal": ["washington"],
  "danish-straits": ["baltic-sea"],
  dover: ["london", "paris"],
  "taiwan-strait": ["taiwan", "beijing"],
  "luzon-strait": ["taiwan", "manila", "south-china-sea"],
  lombok: ["malacca", "singapore"],
  bering: ["moscow", "washington"],
  washington: ["panama-canal", "bering"],
  beijing: ["taiwan", "south-china-sea", "first-island-chain"],
  moscow: ["kyiv", "black-sea", "baltic-sea"],
  kyiv: ["moscow", "black-sea", "warsaw"],
  brussels: ["paris", "berlin", "london"],
  berlin: ["brussels", "warsaw"],
  paris: ["brussels", "london"],
  london: ["dover", "brussels"],
  warsaw: ["kyiv", "baltic-sea", "berlin"],
  ankara: ["bosporus", "black-sea"],
  tehran: ["hormuz", "persian-gulf"],
  riyadh: ["persian-gulf", "hormuz", "red-sea"],
  cairo: ["suez-canal", "red-sea"],
  "new-delhi": ["islamabad", "himalayas"],
  islamabad: ["new-delhi"],
  tokyo: ["ryukyu", "kuril", "east-china-sea"],
  seoul: ["pyongyang", "tokyo"],
  pyongyang: ["seoul", "beijing"],
  manila: ["spratly", "south-china-sea", "luzon-strait"],
  hanoi: ["paracel", "spratly", "south-china-sea"],
  singapore: ["malacca"],
  "south-china-sea": ["spratly", "paracel", "hanoi", "manila"],
  "east-china-sea": ["tokyo", "taiwan", "ryukyu"],
  "persian-gulf": ["hormuz", "tehran", "riyadh"],
  "red-sea": ["suez-canal", "bab-el-mandeb"],
  "gulf-of-aden": ["bab-el-mandeb", "red-sea"],
  mediterranean: ["suez-canal", "gibraltar"],
  "black-sea": ["bosporus", "kyiv", "moscow"],
  "baltic-sea": ["danish-straits", "warsaw"],
  himalayas: ["new-delhi", "beijing"],
  taiwan: ["taiwan-strait", "beijing", "first-island-chain"],
  "first-island-chain": ["taiwan", "ryukyu", "beijing"],
  spratly: ["south-china-sea", "manila", "hanoi"],
  paracel: ["hanoi", "south-china-sea"],
  ryukyu: ["taiwan", "tokyo"],
  kuril: ["tokyo", "moscow"],
};

export function placeById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export function relatedPlaces(p: Place): Place[] {
  return (RELATED_PLACES[p.id] ?? []).map(placeById).filter((x): x is Place => !!x);
}

/** A point to mark a place with: the point itself, or the middle of its line. */
export function placeMidpoint(p: Place): LonLat {
  return p.target[Math.floor(p.target.length / 2)]!;
}

/** Names to look for when a place is mentioned in other text. */
export function placeMentionNames(p: Place): string[] {
  const names = [p.name.replace(/, D\.C\.$/, "")];
  if (p.id === "bosporus") names.push("Bosphorus");
  if (p.id === "first-island-chain") names.push("first island chain");
  return names;
}

/**
 * Ids of places named in `texts` (whole words, case as written). Used to bring
 * places from the user's own exercises into the quiz first.
 */
export function placesMentionedIn(texts: string[], places: Place[] = PLACES): Set<string> {
  const found = new Set<string>();
  const all = texts.join("\n");
  for (const p of places) {
    for (const n of placeMentionNames(p)) {
      const re = new RegExp(`(^|[^A-Za-z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, p.id === "first-island-chain" ? "i" : "");
      // "Taiwan Strait" should not count as a mention of the island "Taiwan" alone, and the reverse.
      const text = p.id === "taiwan" ? all.replace(/Taiwan Strait/g, "") : all;
      if (re.test(text)) {
        found.add(p.id);
        break;
      }
    }
  }
  return found;
}

/** Name for any place id, including places no longer in the quiz. */
export function placeName(id: string): string {
  return placeById(id)?.name ?? RETIRED_PLACE_NAMES[id] ?? id;
}

/** Names said without "the". */
const NO_ARTICLE = new Set(["bab-el-mandeb", "taiwan"]);

/** How a question is asked: by the place's name, or by what it is known for. */
export type QuestionMode = "name" | "clue";

const CLUE_NOUN: Record<PlaceKind, string> = {
  strait: "strait or canal",
  capital: "city",
  sea: "sea or gulf",
  mountains: "mountain range",
  islands: "island or island group",
};

/**
 * "Tap Hanoi, the capital of Vietnam." / "Tap the Strait of Hormuz." In clue mode
 * the question is the "why" note instead: "Tap this strait or canal: The only ...".
 */
export function placeQuestion(p: Place, mode: QuestionMode = "name"): string {
  if (mode === "clue") return `Tap this ${CLUE_NOUN[p.kind]}: ${p.why}`;
  if (p.kind === "capital" && p.country) return `Tap ${p.name}, the capital of ${p.country}.`;
  if (NO_ARTICLE.has(p.id)) return `Tap ${p.name}.`;
  const name = p.id === "first-island-chain" ? p.name.toLowerCase() : p.name;
  return `Tap the ${name}.`;
}
