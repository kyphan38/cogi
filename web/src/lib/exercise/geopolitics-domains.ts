export const GEOPOLITICS_SUBDOMAINS = [
  // Regional Dynamics & Power Centers
  "Southeast Asia & ASEAN strategy",
  "US-China strategic competition",
  "Indo-Pacific security architecture",
  "European security & NATO",
  "Middle East power dynamics",
  "Africa - resources & influence competition",
  "Latin America - regional integration & external influence",
  "Arctic & Antarctic geopolitics (polar routes & resources)",

  // Thematic: Material & Physical Reality
  "Maritime choke points, canals & global straits",
  "Infrastructure corridors, ports & megaprojects (e.g., BRI)",
  "Maritime & territorial disputes",
  "Energy geopolitics (oil, gas, renewables, nuclear)",
  "Climate geopolitics & resource scarcity (water, arable land)",

  // Thematic: System Plumbings & Statecraft
  "Economic statecraft (sanctions, trade wars, tariff barriers)",
  "Monetary hegemony, SWIFT weaponization & de-dollarization",
  "Technology competition (semiconductors, AI, space, cyber)",
  "Nuclear strategy, deterrence & arms control",
  "Global institutions (UN, WTO, IMF - reform & erosion)",
  "Sanctions evasion & shadow fleets",

  // Thematic: Information, Gray-Zone & Legal Fronts
  "Information warfare & narrative competition",
  "Gray-zone operations, espionage & covert sabotage",
  "Lawfare - weaponization of legal systems & treaties",

  // Thematic: Human & Non-State Vectors
  "Migration, demographics & political stability",
  "Violent non-state actors, insurgencies & proxy networks",
  "Transnational crime, cartels & shadow economies",
  "Diaspora politics & soft power",

  // The analytical lenses (Realist, Liberal, Constructivist, Political economy) are a
  // step inside geopolitics exercises now, not topics (PLAN-geopolitics.md G1.3).
] as const;

export type GeopoliticsSubdomain = (typeof GEOPOLITICS_SUBDOMAINS)[number];

/** Browsable geopolitics sections in the shared domain picker (covers all subdomains). */
export const GEOPOLITICS_DOMAIN_GROUPS = [
  {
    id: "geo-regional",
    label: "Geopolitics - regional & power centers",
    domains: [
      "Southeast Asia & ASEAN strategy",
      "US-China strategic competition",
      "Indo-Pacific security architecture",
      "European security & NATO",
      "Middle East power dynamics",
      "Africa - resources & influence competition",
      "Latin America - regional integration & external influence",
      "Arctic & Antarctic geopolitics (polar routes & resources)",
    ],
  },
  {
    id: "geo-material",
    label: "Geopolitics - territory, energy & climate",
    domains: [
      "Maritime choke points, canals & global straits",
      "Infrastructure corridors, ports & megaprojects (e.g., BRI)",
      "Maritime & territorial disputes",
      "Energy geopolitics (oil, gas, renewables, nuclear)",
      "Climate geopolitics & resource scarcity (water, arable land)",
    ],
  },
  {
    id: "geo-statecraft",
    label: "Geopolitics - economics, tech & institutions",
    domains: [
      "Economic statecraft (sanctions, trade wars, tariff barriers)",
      "Monetary hegemony, SWIFT weaponization & de-dollarization",
      "Technology competition (semiconductors, AI, space, cyber)",
      "Nuclear strategy, deterrence & arms control",
      "Global institutions (UN, WTO, IMF - reform & erosion)",
      "Sanctions evasion & shadow fleets",
    ],
  },
  {
    id: "geo-gray-zone",
    label: "Geopolitics - information & gray-zone",
    domains: [
      "Information warfare & narrative competition",
      "Gray-zone operations, espionage & covert sabotage",
      "Lawfare - weaponization of legal systems & treaties",
    ],
  },
  {
    id: "geo-human",
    label: "Geopolitics - migration & non-state actors",
    domains: [
      "Migration, demographics & political stability",
      "Violent non-state actors, insurgencies & proxy networks",
      "Transnational crime, cartels & shadow economies",
      "Diaspora politics & soft power",
    ],
  },
] as const;

const GEOPOLITICS_GROUPED_SET = new Set(
  GEOPOLITICS_DOMAIN_GROUPS.flatMap((g) => g.domains),
);
for (const sub of GEOPOLITICS_SUBDOMAINS) {
  if (!GEOPOLITICS_GROUPED_SET.has(sub)) {
    throw new Error(`Geopolitics subdomain missing from GEOPOLITICS_DOMAIN_GROUPS: ${sub}`);
  }
}
if (GEOPOLITICS_GROUPED_SET.size !== GEOPOLITICS_SUBDOMAINS.length) {
  throw new Error("GEOPOLITICS_DOMAIN_GROUPS has domains not in GEOPOLITICS_SUBDOMAINS");
}

export const GEOPOLITICAL_KEYWORDS = [
  "geopolit",
  "international relations",
  "foreign policy",
  "global affairs",
  "diplomacy",
  "asean",
  "south china sea",
  "nato",
  "sanctions",
  "trade war",
  "supply chain",
  "semiconductor",
  "territorial dispute",
  "maritime security",
  "brics",
  "indo-pacific",
  "strategic competition",
  // Physical / infrastructure
  "chokepoint",
  "strait of",
  "canal",
  "belt and road",
  "bri",
  "arctic route",
  "undersea cable",
  // Monetary / economic plumbing
  "dollarization",
  "de-dollar",
  "reserve currency",
  "swift",
  // Gray-zone / conflict
  "covert",
  "espionage",
  "proxy war",
  "insurgency",
  "militia",
  "lawfare",
  "houthi",
  // Finance / debt
  "sovereign debt",
] as const;

/**
 * Free-text domains matching these keywords still use the geopolitics exercise schema.
 * Catalog subdomains are always browsable via GEOPOLITICS_DOMAIN_GROUPS in DomainInput.
 */
/** Keywords that are stems: they match any word that starts with them. */
const STEM_KEYWORDS = new Set<string>(["geopolit", "de-dollar"]);

/**
 * Acronyms that are also ordinary English words or word parts ("swift", "bri" in
 * "bring"): they only count when written in capitals.
 */
const CAPITALS_ONLY_KEYWORDS = new Set<string>(["swift", "bri"]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One matcher per keyword. Keywords match whole words or phrases (with an optional
 * plural -s/-es), never inside another word: "bri" (Belt and Road) must not match
 * "bring" or "bridge". Stems match at the start of a word.
 */
const KEYWORD_MATCHERS: RegExp[] = GEOPOLITICAL_KEYWORDS.map((kw) => {
  const body = escapeRegExp(kw);
  const end = STEM_KEYWORDS.has(kw) ? "" : "(?:e?s)?(?![a-z0-9])";
  if (CAPITALS_ONLY_KEYWORDS.has(kw)) return new RegExp(`(?<![A-Za-z0-9])${body.toUpperCase()}(?:S)?(?![A-Za-z0-9])`);
  return new RegExp(`(?<![a-z0-9])${body}${end}`, "i");
});

export function isGeopoliticsRelated(domain: string): boolean {
  return KEYWORD_MATCHERS.some((re) => re.test(domain));
}

/** Standalone analytical generation uses geopolitics exercise schema when true. */
export function isGeopoliticsAnalyticalDomain(domain: string): boolean {
  const d = domain.trim();
  return (
    (GEOPOLITICS_SUBDOMAINS as readonly string[]).includes(d) ||
    isGeopoliticsRelated(d)
  );
}
