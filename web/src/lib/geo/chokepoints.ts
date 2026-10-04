import type { CountryId } from "@/lib/geo/countries";
import { wikiSource, type GeoSource, type LonLat } from "@/lib/geo/types";

/**
 * Strategic chokepoints for the Geo Lab (PLAN-geopolitics.md G2). A fixed data set:
 * every fact has a source and was checked on the web on 2026-10-04. The AI never adds
 * facts here; it may only explain these ones.
 */

export const SOURCES = {
  eia: {
    label: "U.S. Energy Information Administration (EIA), World Oil Transit Chokepoints, updated March 2026",
    url: "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints",
  },
  imfRedSea: {
    label: "IMF blog, Red Sea Attacks Disrupt Global Trade, March 2024",
    url: "https://www.imf.org/en/blogs/articles/2024/03/07/red-sea-attacks-disrupt-global-trade",
  },
  suezRevenue: {
    label: "Asharq Al-Awsat (AP report), Egypt's Revenue from the Suez Canal Plunged Sharply in 2024",
    url: "https://english.aawsat.com/business/5133340-egypts-revenue-suez-canal-plunged-sharply-2024",
  },
  panamaUsers: {
    label: "Newsroom Panama, These are the Main Users of the Panama Canal in 2024 (Panama Canal Authority figures)",
    url: "https://newsroompanama.com/2024/12/25/these-are-the-main-users-of-the-panama-canal-in-2024/",
  },
  panamaBritannica: {
    label: "Britannica, Panama Canal",
    url: "https://www.britannica.com/topic/Panama-Canal",
  },
  gibraltarBritannica: {
    label: "Britannica, Strait of Gibraltar",
    url: "https://www.britannica.com/place/Strait-of-Gibraltar",
  },
  malaccaDetour: {
    label: "The Conversation, Could the Strait of Malacca be the next global flashpoint?, April 2026",
    url: "https://theconversation.com/could-the-strait-of-malacca-be-the-next-global-flashpoint-281190",
  },
  blackSeaGrain: {
    label: "United Nations, Black Sea Grain Initiative",
    url: "https://www.un.org/en/black-sea-grain-initiative",
  },
} satisfies Record<string, GeoSource>;

export type ChokepointId =
  | "hormuz"
  | "malacca"
  | "suez"
  | "bab-el-mandeb"
  | "panama"
  | "turkish-straits"
  | "danish-straits"
  | "gibraltar"
  | "cape-of-good-hope";

export type RouteId = "cape" | "indonesia" | "south-america" | "gulf-pipelines" | "caspian-pipeline" | "kiel";

/**
 * A way around a closed chokepoint. The lines are rough sketches for the map, not
 * real ship tracks or pipeline paths; the app says so under the map.
 */
export interface AltRoute {
  id: RouteId;
  label: string;
  kind: "sea" | "land";
  paths: LonLat[][];
}

export const ALT_ROUTES: Record<RouteId, AltRoute> = {
  cape: {
    id: "cape",
    label: "Around Africa, past the Cape of Good Hope",
    kind: "sea",
    paths: [
      [
        [60, 15], [52, 12], [45, -2], [42, -15], [35, -28], [20, -37], [12, -25], [5, -5],
        [-12, 5], [-20, 15], [-15, 30], [-11, 40], [-6, 48],
      ],
    ],
  },
  indonesia: {
    id: "indonesia",
    label: "Through Indonesia: the Lombok or Sunda Strait",
    kind: "sea",
    paths: [
      [
        [85, 4], [100, -8], [115.73, -8.77], [117.8, -4], [119.2, -0.5], [122, 5], [127, 8],
        [130, 18], [126, 30],
      ],
    ],
  },
  "south-america": {
    id: "south-america",
    label: "Around South America: the Strait of Magellan or Cape Horn",
    kind: "sea",
    paths: [
      [
        [-74, 38], [-55, 15], [-33, -5], [-38, -20], [-50, -35], [-60, -45], [-66, -56.5],
        [-78, -50], [-78, -30], [-84, -10], [-95, 5], [-115, 20], [-123, 36],
      ],
    ],
  },
  "gulf-pipelines": {
    id: "gulf-pipelines",
    label: "Oil pipelines across Saudi Arabia and the UAE",
    kind: "land",
    paths: [
      [[49.68, 25.94], [38.06, 24.09]],
      [[53.5, 23.8], [56.33, 25.12]],
    ],
  },
  "caspian-pipeline": {
    id: "caspian-pipeline",
    label: "Oil pipelines over land to Türkiye's Mediterranean coast",
    kind: "land",
    paths: [[[49.87, 40.41], [44.79, 41.72], [35.81, 37.03]]],
  },
  kiel: {
    id: "kiel",
    label: "The Kiel Canal in Germany",
    kind: "sea",
    paths: [[[7.5, 54.0], [9.14, 53.89], [10.15, 54.37], [11, 54.6]]],
  },
};

export interface SourcedFact {
  label: string;
  value: string;
  source: GeoSource;
}

/** Answers for "Close the strait": who depends on it and how ships get around it. */
export interface StraitGame {
  /** Countries that depend most on this chokepoint (the answer). */
  dependents: CountryId[];
  /** Why these countries, in one or two plain sentences, with its source. */
  dependentsWhy: string;
  dependentsSources: GeoSource[];
  /** Other countries offered as choices; none of them is a top user in the source. */
  decoys: CountryId[];
  route: RouteId;
  routeOptions: [RouteId, RouteId, RouteId];
  /** What the detour costs, from the source. Numbers only when the source gives them. */
  detour: {
    text: string;
    source: GeoSource;
    nauticalMiles?: [number, number];
    days?: [number, number];
  };
}

export interface Chokepoint {
  id: ChokepointId;
  name: string;
  coords: LonLat;
  coordsSource: GeoSource;
  /** "the Persian Gulf and the Arabian Sea" */
  connects: string;
  /** One or two plain sentences on why it matters. */
  why: string;
  /** What mainly passes, as the sources describe it (shown, not scored). */
  goods: string;
  facts: SourcedFact[];
  /** Present when the chokepoint is part of "Close the strait". */
  game?: StraitGame;
}

export const CHOKEPOINTS: Chokepoint[] = [
  {
    id: "hormuz",
    name: "Strait of Hormuz",
    coords: [56.5, 26.6],
    coordsSource: wikiSource("Strait of Hormuz"),
    connects: "the Persian Gulf and the Arabian Sea",
    why: "The only sea way out of the Persian Gulf. About a fifth of the oil the world uses passes here.",
    goods: "Crude oil, oil products and liquefied natural gas (LNG), mainly from Gulf producers such as Saudi Arabia and Qatar.",
    facts: [
      { label: "Oil through the strait", value: "20.9 million barrels a day (first half of 2025)", source: SOURCES.eia },
      { label: "Share of world oil use", value: "About 20%", source: SOURCES.eia },
      { label: "Share of world LNG trade", value: "Over 20%, mainly from Qatar", source: SOURCES.eia },
      { label: "Crude oil going to Asia", value: "89%", source: SOURCES.eia },
    ],
    game: {
      dependents: ["156", "356", "392", "410"],
      dependentsWhy:
        "China, India, Japan and South Korea took 74% of the crude oil that passed the strait in the first half of 2025.",
      dependentsSources: [SOURCES.eia],
      decoys: ["840", "276", "076", "036"],
      route: "gulf-pipelines",
      routeOptions: ["cape", "gulf-pipelines", "indonesia"],
      detour: {
        text: "There is no other sea route. Pipelines in Saudi Arabia and the UAE could carry about 4.7 million barrels a day around the strait, much less than the 20.9 million that pass it.",
        source: SOURCES.eia,
      },
    },
  },
  {
    id: "malacca",
    name: "Strait of Malacca",
    coords: [100.19, 3.99],
    coordsSource: {
      label: "Wikipedia: Strait of Malacca (midpoint of the limits listed in the article)",
      url: "https://en.wikipedia.org/wiki/Strait_of_Malacca",
    },
    connects: "the Indian Ocean and the Pacific Ocean",
    why: "The shortest sea route from Middle East oil and gas to East Asia. More oil passes here than through any other chokepoint.",
    goods: "Crude oil, oil products and LNG, mostly from the Middle East to East Asia.",
    facts: [
      { label: "Oil through the strait", value: "23.2 million barrels a day (first half of 2025)", source: SOURCES.eia },
      { label: "Share of oil moved by sea", value: "29%", source: SOURCES.eia },
      { label: "China's share of oil imports through it", value: "48%", source: SOURCES.eia },
    ],
    game: {
      dependents: ["156", "392", "410"],
      dependentsWhy:
        "Most crude oil through the strait goes from the Middle East to East Asian countries. China alone took 48% of the imports in the first half of 2025.",
      dependentsSources: [SOURCES.eia],
      decoys: ["276", "076", "566", "484"],
      route: "indonesia",
      routeOptions: ["indonesia", "cape", "south-america"],
      detour: {
        text: "Ships can go through Indonesia instead, by the Lombok or Sunda Strait. That adds roughly 1,000 to 1,500 nautical miles, or three to five days at sea.",
        source: SOURCES.malaccaDetour,
        nauticalMiles: [1000, 1500],
        days: [3, 5],
      },
    },
  },
  {
    id: "suez",
    name: "Suez Canal",
    coords: [32.34, 30.71],
    coordsSource: wikiSource("Suez Canal"),
    connects: "the Mediterranean Sea and the Red Sea",
    why: "The shortest sea route between Asia and Europe. About 15% of world sea trade normally passes here.",
    goods: "Trade between Asia and Europe, plus oil and gas from the Persian Gulf to Europe.",
    facts: [
      { label: "Share of world sea trade (normal times)", value: "About 15%", source: SOURCES.imfRedSea },
      { label: "Oil through the canal and the SUMED pipeline", value: "4.9 million barrels a day (first half of 2025)", source: SOURCES.eia },
      { label: "Egypt's canal revenue", value: "$10.25 billion in 2023, $3.99 billion in 2024", source: SOURCES.suezRevenue },
    ],
    game: {
      dependents: ["818", "643"],
      dependentsWhy:
        "Egypt earns fees from the canal: its revenue fell from $10.25 billion in 2023 to $3.99 billion in 2024 when ships avoided the Red Sea. Russia moved more crude oil through the canal than any other country in the first half of 2025.",
      dependentsSources: [SOURCES.suezRevenue, SOURCES.eia],
      decoys: ["076", "036", "484", "124"],
      route: "cape",
      routeOptions: ["south-america", "cape", "indonesia"],
      detour: {
        text: "Ships sail around Africa instead. For oil tankers, that adds about 15 days from the Arabian Sea to Europe.",
        source: SOURCES.eia,
        days: [15, 15],
      },
    },
  },
  {
    id: "bab-el-mandeb",
    name: "Bab el-Mandeb",
    coords: [43.33, 12.58],
    coordsSource: wikiSource("Bab al-Mandab Strait"),
    connects: "the Red Sea and the Gulf of Aden",
    why: "The southern gate of the Red Sea. Ships between Asia and the Suez Canal must pass it, so closing it also cuts the Suez route.",
    goods: "The same traffic as the Suez Canal: trade between Asia and Europe, plus oil and gas.",
    facts: [
      { label: "Oil through the strait", value: "4.2 million barrels a day (first half of 2025), about half of 2023", source: SOURCES.eia },
      { label: "Why it fell", value: "Attacks on ships in the Red Sea from November 2023", source: SOURCES.eia },
      { label: "Effect on Suez trade", value: "Down 50% in early 2024 compared with a year before", source: SOURCES.imfRedSea },
    ],
    game: {
      dependents: ["818", "643"],
      dependentsWhy:
        "It is the same route as the Suez Canal. Egypt's canal revenue fell from $10.25 billion in 2023 to $3.99 billion in 2024 when ships avoided this strait, and Russia moved more crude oil through it than any other country in the first half of 2025.",
      dependentsSources: [SOURCES.suezRevenue, SOURCES.eia],
      decoys: ["076", "036", "484", "124"],
      route: "cape",
      routeOptions: ["cape", "gulf-pipelines", "south-america"],
      detour: {
        text: "Ships sail around Africa instead. In early 2024 this made deliveries 10 days or more later on average.",
        source: SOURCES.imfRedSea,
        days: [10, 10],
      },
    },
  },
  {
    id: "panama",
    name: "Panama Canal",
    coords: [-79.75, 9.12],
    coordsSource: wikiSource("Panama Canal"),
    connects: "the Atlantic Ocean (Caribbean Sea) and the Pacific Ocean",
    why: "A shortcut between the Atlantic and Pacific coasts of the Americas, and from the US Gulf Coast to Asia. About 5% of world sea trade usually passes here.",
    goods: "Many kinds of cargo, including oil products, LNG and propane from the US Gulf Coast to Asia.",
    facts: [
      { label: "Share of world sea trade", value: "About 5%", source: SOURCES.imfRedSea },
      { label: "Biggest user (cargo, fiscal year 2024)", value: "United States, 74.7% of cargo", source: SOURCES.panamaUsers },
      { label: "Trade during the 2023-24 drought", value: "Down almost 32% in early 2024 compared with a year before", source: SOURCES.imfRedSea },
    ],
    game: {
      dependents: ["840", "156", "392", "410", "152"],
      dependentsWhy:
        "These were the five biggest users by cargo in fiscal year 2024: the United States (74.7%), China (21.4%), Japan (14.6%), South Korea (9.4%) and Chile (8.3%).",
      dependentsSources: [SOURCES.panamaUsers],
      decoys: ["356", "818", "643", "276"],
      route: "south-america",
      routeOptions: ["south-america", "kiel", "indonesia"],
      detour: {
        text: "Ships go around South America. Between the US East and West Coasts, that adds about 8,000 nautical miles (15,000 km).",
        source: SOURCES.panamaBritannica,
        nauticalMiles: [8000, 8000],
      },
    },
  },
  {
    id: "turkish-straits",
    name: "Turkish Straits (Bosporus and Dardanelles)",
    coords: [28.23, 40.72],
    coordsSource: wikiSource("Turkish Straits"),
    connects: "the Black Sea and the Mediterranean Sea",
    why: "The only sea way out of the Black Sea. Less than half a nautical mile wide at the narrowest point.",
    goods: "Crude oil and oil products from Kazakhstan, Russia and Azerbaijan, and grain from Black Sea ports.",
    facts: [
      { label: "Oil through the straits", value: "3.7 million barrels a day (first half of 2025)", source: SOURCES.eia },
      { label: "Ships in 2024", value: "More than 45,000", source: SOURCES.eia },
      { label: "Largest oil exporter through them", value: "Kazakhstan", source: SOURCES.eia },
    ],
    game: {
      dependents: ["398", "643", "804"],
      dependentsWhy:
        "Kazakhstan is the largest oil exporter through the straits, and Russia uses Black Sea ports as a main export route. Ukraine's grain ships from Odesa, Chornomorsk and Pivdennyi also sail out past Istanbul.",
      dependentsSources: [SOURCES.eia, SOURCES.blackSeaGrain],
      decoys: ["364", "276", "682", "818"],
      route: "caspian-pipeline",
      routeOptions: ["kiel", "caspian-pipeline", "cape"],
      detour: {
        text: "There is no other sea way out of the Black Sea. Some oil can go by pipeline instead, such as the Baku-Tbilisi-Ceyhan pipeline from Azerbaijan to Türkiye.",
        source: SOURCES.eia,
      },
    },
  },
  {
    id: "danish-straits",
    name: "Danish Straits",
    coords: [11, 56],
    coordsSource: wikiSource("Danish Straits"),
    connects: "the Baltic Sea and the North Sea",
    why: "The sea gate of the Baltic. Russia's Baltic oil ports and countries such as Poland and Finland depend on it.",
    goods: "Crude oil and oil products, and LNG for countries around the Baltic.",
    facts: [
      { label: "Oil through the straits", value: "4.9 million barrels a day (first half of 2025)", source: SOURCES.eia },
      { label: "Largest oil exporter through them", value: "Russia", source: SOURCES.eia },
      { label: "Oil through the Kiel Canal instead", value: "Nearly 200,000 barrels a day", source: SOURCES.eia },
    ],
    game: {
      dependents: ["643", "616", "246"],
      dependentsWhy:
        "Russia was still the largest oil exporter through the straits in the first half of 2025. Poland and Finland, east of the straits, now import oil through them from countries such as the United States and Norway.",
      dependentsSources: [SOURCES.eia],
      decoys: ["724", "380", "300", "620"],
      route: "kiel",
      routeOptions: ["cape", "kiel", "caspian-pipeline"],
      detour: {
        text: "The Kiel Canal in Germany is the other way, but it only takes small tankers. It carried nearly 200,000 barrels a day, against 4.9 million through the straits.",
        source: SOURCES.eia,
      },
    },
  },
  {
    id: "gibraltar",
    name: "Strait of Gibraltar",
    coords: [-5.5, 35.95],
    coordsSource: wikiSource("Strait of Gibraltar"),
    connects: "the Mediterranean Sea and the Atlantic Ocean",
    why: "The western gate of the Mediterranean, between Spain and Morocco. It is 13 km wide at the narrowest point.",
    goods: "A key shipping route for southern Europe, northern Africa and western Asia.",
    facts: [
      { label: "Length", value: "58 km", source: SOURCES.gibraltarBritannica },
      { label: "Narrowest width", value: "13 km", source: SOURCES.gibraltarBritannica },
    ],
  },
  {
    id: "cape-of-good-hope",
    name: "Cape of Good Hope",
    coords: [18.48, -34.36],
    coordsSource: wikiSource("Cape of Good Hope"),
    connects: "the Atlantic Ocean and the Indian Ocean (around southern Africa)",
    why: "Not a narrow strait but the long way around Africa. Ships use it when the Red Sea route is closed or unsafe.",
    goods: "Oil and container ships that avoid the Suez Canal and the Red Sea.",
    facts: [
      { label: "Oil around the cape", value: "9.1 million barrels a day (first half of 2025)", source: SOURCES.eia },
      { label: "Share of oil moved by sea", value: "11%", source: SOURCES.eia },
      { label: "Trade around the cape, early 2024", value: "Up about 74% on a year before", source: SOURCES.imfRedSea },
    ],
  },
];

export const STRAIT_GAME_IDS = CHOKEPOINTS.filter((c) => c.game).map((c) => c.id);

export function chokepointById(id: string): Chokepoint | undefined {
  return CHOKEPOINTS.find((c) => c.id === id);
}

/** 1 nautical mile = 1.852 km (exact by definition). */
export function nauticalMilesToKm(nm: number): number {
  return nm * 1.852;
}
