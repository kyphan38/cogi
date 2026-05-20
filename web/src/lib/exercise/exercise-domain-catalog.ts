/**
 * Curated exercise domains for every flow that uses {@link DomainInput}.
 * Geopolitics subdomains are defined in `geopolitics-domains.ts` and merged
 * into the picker as grouped sections alongside technology, life, business, etc.
 */

import {
  GEOPOLITICS_DOMAIN_GROUPS,
  GEOPOLITICS_SUBDOMAINS,
} from "@/lib/exercise/geopolitics-domains";

export type ExerciseDomainGroup = {
  id: string;
  label: string;
  domains: readonly string[];
};

export const EXERCISE_DOMAIN_CATALOG: ExerciseDomainGroup[] = [
  {
    id: "technology",
    label: "Technology & engineering",
    domains: [
      "DevOps / SRE",
      "Platform & reliability engineering",
      "Solution architecture",
      "Cloud infrastructure & FinOps",
      "Security engineering",
      "Software delivery & CI/CD",
      "Site reliability & incident response",
    ],
  },
  {
    id: "data-ai",
    label: "Data, AI & ML",
    domains: [
      "MLOps",
      "Data engineering",
      "Data science & analytics",
      "LLM / AI product delivery",
      "Feature stores & model governance",
      "Experiment design & A/B testing",
    ],
  },
  {
    id: "business-economy",
    label: "Business & economy",
    domains: [
      "Macroeconomics & markets",
      "Microeconomics & pricing",
      "Business strategy & operations",
      "Entrepreneurship & product-market fit",
      "Supply chain & operations",
      "Personal finance & investing basics",
    ],
  },
  {
    id: "life-personal",
    label: "Life & personal development",
    domains: [
      "Financial planning",
      "Household budgeting & shared finances",
      "Life strategy",
      "Career planning & job decisions",
      "Study abroad & education choices",
      "Time management & priorities",
      "Social & communication",
      "Negotiation & conflict resolution",
      "Persuasion & stakeholder alignment",
      "Health & wellness tradeoffs",
      "Parenting & family logistics",
    ],
  },
  {
    id: "professional",
    label: "Professional judgment",
    domains: [
      "Organizational change & leadership",
      "Project & program management",
      "Product management",
      "Policy & regulation (domestic)",
      "Ethics & professional judgment",
      "Hiring & team design",
    ],
  },
  {
    id: "general",
    label: "General practice",
    domains: [
      "Everyday decisions",
      "Risk & uncertainty",
      "Critical reading & media literacy",
      "Custom domain",
    ],
  },
] as const;

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

  const geoChildren: DomainPickerTreeGroup[] = [];
  for (const group of GEOPOLITICS_DOMAIN_GROUPS) {
    const domains = filterGroupDomains(
      group.domains,
      query,
      dismissed,
      excludeFromCatalog,
    );
    if (domains.length === 0) continue;
    geoChildren.push({
      id: group.id,
      label: group.label.replace(/^Geopolitics - /, ""),
      domains,
    });
  }

  if (geoChildren.length > 0) {
    tree.push({
      id: "geopolitics-root",
      label: "Geopolitics & international affairs",
      domains: [],
      children: geoChildren,
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
