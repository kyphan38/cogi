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

  // Analytical Frameworks & Lenses
  "Realist lens - power, security, self-interest",
  "Liberal institutionalist lens - rules, norms, cooperation",
  "Constructivist lens - identity, narrative, perception",
  "Political economy lens - who benefits, follow the money",
  "Geographical determinism lens - topography, rivers & borders",
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
  {
    id: "geo-lenses",
    label: "Geopolitics - analytical lenses",
    domains: [
      "Realist lens - power, security, self-interest",
      "Liberal institutionalist lens - rules, norms, cooperation",
      "Constructivist lens - identity, narrative, perception",
      "Political economy lens - who benefits, follow the money",
      "Geographical determinism lens - topography, rivers & borders",
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
export function isGeopoliticsRelated(domain: string): boolean {
  const lower = domain.toLowerCase();
  return GEOPOLITICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Standalone analytical generation uses geopolitics exercise schema when true. */
export function isGeopoliticsAnalyticalDomain(domain: string): boolean {
  const d = domain.trim();
  return (
    (GEOPOLITICS_SUBDOMAINS as readonly string[]).includes(d) ||
    isGeopoliticsRelated(d)
  );
}
