/**
 * Curated exercise domains for every flow that uses {@link DomainInput}.
 * Geopolitics subdomains are defined in `geopolitics-domains.ts` and merged
 * into the picker as grouped sections alongside technology, life, business, etc.
 */

import {
  GEOPOLITICS_DOMAIN_GROUPS,
  GEOPOLITICS_SUBDOMAINS,
} from "@/lib/exercise/geopolitics-domains";
import type { ThinkingType } from "@/lib/types/exercise";

export type ExerciseDomainGroup = {
  id: string;
  label: string;
  domains: readonly string[];
  /**
   * Exercise types this group fits best (a hint for "Find best mode" and a check that
   * every exercise type has topics). Geopolitics groups leave it out.
   */
  bestFor?: readonly ThinkingType[];
};

export const EXERCISE_DOMAIN_CATALOG: ExerciseDomainGroup[] = [
  {
    id: "technology",
    label: "Technology & engineering",
    bestFor: ["systems", "evaluative", "analytical"],
    domains: [
      "DevOps / SRE",
      "Platform & reliability engineering",
      "Solution architecture",
      "Cloud infrastructure & FinOps",
      "Security engineering",
      "Software delivery & CI/CD",
      "Site reliability & incident response",
      "Systems design & scalability",
      "Technical debt & refactoring tradeoffs",
      "Open source strategy",
    ],
  },
  {
    id: "data-ai",
    label: "Data, AI & ML",
    bestFor: ["systems", "evaluative", "analytical"],
    domains: [
      "MLOps",
      "Data engineering",
      "Data science & analytics",
      "LLM / AI product delivery",
      "Feature stores & model governance",
      "Experiment design & A/B testing",
      "AI safety & alignment",
      "Data privacy & governance",
      "Prompt engineering & agent design",
      "Vector search & retrieval systems",
    ],
  },
  {
    id: "business-economy",
    label: "Business & economy",
    bestFor: ["systems", "evaluative", "strategy", "analytical"],
    domains: [
      "Macroeconomics & markets",
      "Microeconomics & pricing",
      "Interest rates & central banks",
      "Inflation & cost of living",
      "Exchange rates & imported goods",
      "Jobs, wages & the labour market",
      "Housing market & real estate",
      "Business strategy & operations",
      "Entrepreneurship & product-market fit",
      "Logistics & operations management",
      "Mergers & acquisitions",
      "Pricing & monetization strategy",
      "Marketing & growth strategy",
      "Corporate finance & valuation",
    ],
  },
  {
    id: "personal-money",
    label: "Personal money",
    bestFor: ["evaluative", "calibration", "judgment"],
    domains: [
      "Financial planning",
      "Household budgeting & shared finances",
      "Personal finance & investing basics",
      "Saving vs paying off debt",
      "Loans, credit cards & buying on credit",
      "Renting vs buying a home",
      "Insurance choices",
      "Side income & freelancing",
      "Retirement & long-term saving",
      "Big purchases (car, phone, home)",
    ],
  },
  {
    id: "life-personal",
    label: "Life & personal development",
    bestFor: ["judgment", "evaluative", "reframe"],
    domains: [
      "Life strategy",
      "Career planning & job decisions",
      "Changing jobs or careers",
      "Study abroad & education choices",
      "Choosing a university major",
      "Time management & priorities",
      "Health & wellness tradeoffs",
      "Habit formation & behavior change",
      "Moving out & living on your own",
      "Travel & relocation planning",
    ],
  },
  {
    id: "mind-emotions",
    label: "Mind & emotions",
    bestFor: ["reframe", "judgment"],
    domains: [
      "Stress & pressure at work",
      "Exam & performance anxiety",
      "Perfectionism & self-criticism",
      "Procrastination & motivation",
      "Social media & comparing yourself",
      "Criticism & rejection",
      "Burnout & recovery",
      "Confidence & impostor feelings",
      "Anger & frustration",
      "Loneliness & belonging",
      "Worry about the future",
      "Mistakes & setbacks",
    ],
  },
  {
    id: "relationships-family",
    label: "Relationships & family",
    bestFor: ["judgment", "reframe", "strategy"],
    domains: [
      "Social & communication",
      "Parents & adult children",
      "Couples & partners",
      "In-laws & extended family",
      "Money between relatives & friends",
      "Friendship conflicts",
      "Boss & manager relationships",
      "Colleagues & office politics",
      "Parenting & family logistics",
      "Raising teenagers",
      "Family expectations & career choices",
      "Neighbours & community life",
    ],
  },
  {
    id: "competition-negotiation",
    label: "Competition, negotiation & games",
    bestFor: ["strategy", "judgment", "evaluative"],
    domains: [
      "Negotiation & conflict resolution",
      "Persuasion & stakeholder alignment",
      "Salary & job offer negotiation",
      "Price wars & competing businesses",
      "Auctions & bidding",
      "Teamwork & free riders",
      "Shared resources & the commons",
      "Escalation & arms races",
      "Coordination & industry standards",
      "Elections & voting",
      "Sports & game tactics",
      "Haggling & market bargaining",
      "Platforms & network effects",
      "Trust & reputation in repeated deals",
    ],
  },
  {
    id: "risk-forecasting",
    label: "Probability, risk & forecasting",
    bestFor: ["calibration", "evaluative", "analytical"],
    domains: [
      "Risk & uncertainty",
      "Medical tests & screening results",
      "Insurance & everyday risk",
      "Lotteries, gambling & odds",
      "Forecasts & predictions",
      "Polls & surveys",
      "Everyday statistics & base rates",
      "Scams & online fraud",
      "Natural hazards & weather",
      "Investment risk & returns",
      "Estimation & quick math",
    ],
  },
  {
    id: "media-claims",
    label: "News, media & claims",
    bestFor: ["analytical", "calibration"],
    domains: [
      "Critical reading & media literacy",
      "Advertising & product claims",
      "Health claims & wellness trends",
      "News headlines & statistics",
      "Rumours on social media",
      "Science in the news",
      "Political speeches & debates",
      "Product reviews & ratings",
      "Influencer marketing",
      "AI-generated content & deepfakes",
    ],
  },
  {
    id: "society-environment",
    label: "Cities, society & environment",
    bestFor: ["systems", "evaluative", "strategy"],
    domains: [
      "Traffic & public transport",
      "Housing & urban growth",
      "Ecosystems & biodiversity",
      "Food systems & farming",
      "Water, floods & droughts",
      "Air pollution",
      "Waste & recycling",
      "Tourism & local communities",
      "Ageing population & pensions",
      "Energy transition & electricity",
    ],
  },
  {
    id: "vietnam",
    label: "Vietnam today",
    bestFor: ["judgment", "systems", "evaluative", "calibration"],
    domains: [
      "Vietnamese family life & traditions",
      "Working in a Vietnamese company",
      "University entrance exams & study in Vietnam",
      "Housing & real estate in Vietnam",
      "Traffic & motorbikes in Vietnamese cities",
      "Gold, savings & investing in Vietnam",
      "Small family businesses in Vietnam",
      "Mekong Delta farming & rising seas",
      "Tourism in Vietnam",
      "E-commerce & the digital economy in Vietnam",
      "Foreign investment & factories in Vietnam",
    ],
  },
  {
    id: "professional",
    label: "Professional judgment",
    bestFor: ["judgment", "evaluative", "strategy"],
    domains: [
      "Organizational change & leadership",
      "Project & program management",
      "Product management",
      "Policy & regulation (domestic)",
      "Ethics & professional judgment",
      "Hiring & team design",
      "Performance management & feedback",
      "Vendor & contract negotiation",
      "Crisis management & communications",
      "Remote & hybrid team operations",
    ],
  },
  {
    id: "science-research",
    label: "Science & research",
    bestFor: ["analytical", "calibration", "systems"],
    domains: [
      "Research methodology & study design",
      "Statistical inference & causal claims",
      "Scientific publishing & peer review",
      "Clinical trial design",
      "Climate & environmental science",
      "Public health policy",
      "Meta-analysis & systematic review",
      "Data reproducibility & open science",
      "Grant strategy & research funding",
      "Emerging technology forecasting",
    ],
  },
  {
    id: "health-medicine",
    label: "Health & medicine",
    bestFor: ["evaluative", "analytical", "calibration"],
    domains: [
      "Health policy & health systems",
      "Clinical decision-making",
      "Epidemiology & disease surveillance",
      "Nutrition & wellness science",
      "Mental health & therapy approaches",
      "Medical ethics & informed consent",
      "Health insurance & healthcare economics",
      "Preventive care & screening decisions",
      "Pharmaceutical & drug policy",
      "Aging & long-term care planning",
    ],
  },
  {
    id: "law-governance",
    label: "Law & governance",
    bestFor: ["analytical", "evaluative", "strategy"],
    domains: [
      "Contract law & negotiation",
      "Regulatory compliance",
      "Intellectual property strategy",
      "Constitutional & civil rights law",
      "Criminal justice policy",
      "Corporate governance",
      "International law & treaties",
      "Employment & labor law",
      "Privacy & data protection law",
      "Judicial reasoning & precedent",
    ],
  },
  {
    id: "education-learning",
    label: "Education & learning",
    bestFor: ["evaluative", "analytical", "judgment"],
    domains: [
      "Curriculum design & pedagogy",
      "Standardized testing & assessment",
      "Higher education strategy",
      "Online & remote learning",
      "Skill acquisition & mastery",
      "Education policy & funding",
      "Special education & accessibility",
      "Lifelong learning & upskilling",
      "Academic research supervision",
      "School choice & admissions",
    ],
  },
  {
    id: "general",
    label: "General practice",
    bestFor: ["evaluative", "analytical", "judgment"],
    domains: [
      "Everyday decisions",
      "Legal reasoning & case analysis",
      "Consumer decisions & purchases",
      "Home & DIY projects",
      "Technology adoption choices",
      "Community & civic participation",
      "Media & entertainment choices",
      "Custom domain",
    ],
  },
] as const;

/** The catalog group a domain belongs to (exact match), if any. */
export function catalogGroupOf(domain: string): ExerciseDomainGroup | undefined {
  const d = domain.trim();
  return EXERCISE_DOMAIN_CATALOG.find((g) => g.domains.includes(d));
}

const ALL_CATALOG_GROUPS: ExerciseDomainGroup[] = [
  ...EXERCISE_DOMAIN_CATALOG,
  ...GEOPOLITICS_DOMAIN_GROUPS,
];

/** Flat, deduplicated list of all picker domains (excludes "Custom domain"). */
export const EXERCISE_DOMAIN_SUGGESTIONS: readonly string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of ALL_CATALOG_GROUPS) {
    for (const d of group.domains) {
      if (d === "Custom domain" || seen.has(d)) continue;
      seen.add(d);
      out.push(d);
    }
  }
  return out;
})();

export type CatalogDropdownSection = {
  label: string;
  domains: string[];
};

/** Expandable group in the domain picker tree (may nest under geopolitics). */
export type DomainPickerTreeGroup = {
  id: string;
  label: string;
  domains: string[];
  children?: DomainPickerTreeGroup[];
};

function matchesQuery(domain: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return domain.toLowerCase().includes(q);
}

function buildSectionsForGroups(
  groups: readonly ExerciseDomainGroup[],
  options: {
    query: string;
    dismissed: Set<string>;
    exclude: Set<string>;
    perGroup: number;
    maxGroups: number;
  },
): CatalogDropdownSection[] {
  const { query, dismissed, exclude, perGroup, maxGroups } = options;
  const sections: CatalogDropdownSection[] = [];

  for (const group of groups.slice(0, maxGroups)) {
    const domains = group.domains.filter(
      (d) =>
        d !== "Custom domain" &&
        !dismissed.has(d) &&
        !exclude.has(d) &&
        matchesQuery(d, query),
    );
    if (domains.length === 0) continue;
    sections.push({
      label: group.label,
      domains: domains.slice(0, perGroup),
    });
  }

  return sections;
}

/**
 * Grouped catalog rows for the domain picker dropdown.
 * Recent/history domains should be passed via `exclude` so they are not duplicated.
 */
export function getCatalogDropdownSections(options: {
  query: string;
  dismissed?: Set<string>;
  exclude?: Set<string>;
  /** When the field is empty, cap how many domains appear per group (browse mode). */
  emptyQueryPerGroup?: number;
  /** When filtering by query, max domains per group. */
  filteredPerGroup?: number;
  /** Max non-geopolitics groups to render. */
  maxGroups?: number;
  /** Max geopolitics groups to render (defaults to all). */
  maxGeopoliticsGroups?: number;
  /** Per-group cap for geopolitics browse mode (often show a few more). */
  geopoliticsEmptyQueryPerGroup?: number;
  geopoliticsFilteredPerGroup?: number;
}): CatalogDropdownSection[] {
  const {
    query,
    dismissed = new Set(),
    exclude = new Set(),
    emptyQueryPerGroup = 3,
    filteredPerGroup = 5,
    maxGroups = EXERCISE_DOMAIN_CATALOG.length,
    maxGeopoliticsGroups = GEOPOLITICS_DOMAIN_GROUPS.length,
    geopoliticsEmptyQueryPerGroup = 4,
    geopoliticsFilteredPerGroup = 6,
  } = options;

  const browseMode = query.trim().length === 0;
  const generalPerGroup = browseMode ? emptyQueryPerGroup : filteredPerGroup;
  const geoPerGroup = browseMode ? geopoliticsEmptyQueryPerGroup : geopoliticsFilteredPerGroup;

  return [
    ...buildSectionsForGroups(EXERCISE_DOMAIN_CATALOG, {
      query,
      dismissed,
      exclude,
      perGroup: generalPerGroup,
      maxGroups,
    }),
    ...buildSectionsForGroups(GEOPOLITICS_DOMAIN_GROUPS, {
      query,
      dismissed,
      exclude,
      perGroup: geoPerGroup,
      maxGroups: maxGeopoliticsGroups,
    }),
  ];
}

export function isExerciseCatalogDomain(domain: string): boolean {
  const d = domain.trim();
  return (EXERCISE_DOMAIN_SUGGESTIONS as readonly string[]).includes(d);
}

export function isGeopoliticsCatalogDomain(domain: string): boolean {
  const d = domain.trim();
  return (GEOPOLITICS_SUBDOMAINS as readonly string[]).includes(d);
}

function filterGroupDomains(
  domains: readonly string[],
  query: string,
  dismissed: Set<string>,
  exclude: Set<string>,
): string[] {
  return domains.filter(
    (d) =>
      d !== "Custom domain" &&
      !dismissed.has(d) &&
      !exclude.has(d) &&
      matchesQuery(d, query),
  );
}

function groupHasVisibleContent(group: DomainPickerTreeGroup): boolean {
  if (group.domains.length > 0) return true;
  return (group.children?.some(groupHasVisibleContent) ?? false);
}

/**
 * Full tree for DomainInput - no per-group caps; expand a branch to see every match.
 */
export function getDomainPickerTree(options: {
  query: string;
  recentDomains: string[];
  dismissed?: Set<string>;
  excludeFromCatalog?: Set<string>;
}): DomainPickerTreeGroup[] {
  const {
    query,
    recentDomains,
    dismissed = new Set(),
    excludeFromCatalog = new Set(),
  } = options;

  const tree: DomainPickerTreeGroup[] = [];

  const recent = recentDomains.filter(
    (d) => !dismissed.has(d) && matchesQuery(d, query),
  );
  if (recent.length > 0) {
    tree.push({
      id: "recent",
      label: "Your recent domains",
      domains: recent,
    });
  }

  for (const group of EXERCISE_DOMAIN_CATALOG) {
    const domains = filterGroupDomains(
      group.domains,
      query,
      dismissed,
      excludeFromCatalog,
    );
    if (domains.length === 0) continue;
    tree.push({ id: group.id, label: group.label, domains });
  }

  // Geopolitics groups are pushed as top-level entries (not nested under a
  // wrapper) so the picker never exceeds 2 levels deep (group -> domain).
  for (const group of GEOPOLITICS_DOMAIN_GROUPS) {
    const domains = filterGroupDomains(
      group.domains,
      query,
      dismissed,
      excludeFromCatalog,
    );
    if (domains.length === 0) continue;
    tree.push({
      id: group.id,
      label: group.label,
      domains,
    });
  }

  return tree;
}

/** Collect group ids that should start expanded when filtering. */
export function getAutoExpandedGroupIds(tree: DomainPickerTreeGroup[]): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: DomainPickerTreeGroup[]) => {
    for (const node of nodes) {
      if (groupHasVisibleContent(node)) ids.add(node.id);
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return ids;
}

/** Leaf domains in tree order (visible leaves only) for keyboard selection. */
export function flattenVisibleTreeLeaves(
  tree: DomainPickerTreeGroup[],
  expanded: Set<string>,
): string[] {
  const out: string[] = [];
  const walk = (nodes: DomainPickerTreeGroup[]) => {
    for (const node of nodes) {
      if (!expanded.has(node.id)) continue;
      out.push(...node.domains);
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return out;
}

/**
 * Pick a random domain from the full catalog (technology, business, health,
 * geopolitics, etc). Used by the "surprise me" / randomize control on
 * {@link DomainInput}. Avoids the current value and any dismissed domains
 * when possible, but falls back to the full pool rather than returning
 * nothing.
 */
export function getRandomDomainSuggestion(options?: {
  exclude?: Set<string>;
  avoid?: string;
}): string | undefined {
  const exclude = options?.exclude ?? new Set<string>();
  const avoid = options?.avoid?.trim();
  const pool = EXERCISE_DOMAIN_SUGGESTIONS.filter(
    (d) => !exclude.has(d) && d !== avoid,
  );
  const source = pool.length > 0 ? pool : EXERCISE_DOMAIN_SUGGESTIONS;
  if (source.length === 0) return undefined;
  return source[Math.floor(Math.random() * source.length)];
}
