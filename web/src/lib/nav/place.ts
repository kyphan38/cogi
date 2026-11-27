import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";

export interface NavPage {
  href: string;
  label: string;
}

export interface NavGroup extends NavPage {
  pages: readonly NavPage[];
}

/**
 * The four groups of the top bar, in order (PLAN-guide G1). A group's link opens
 * its first page. URLs did not change when the groups did.
 */
export const NAV_GROUPS = [
  {
    href: "/",
    label: "Practice",
    pages: [
      { href: "/", label: "Today" },
      { href: "/quick", label: "5-minute question" },
      { href: "/tracks", label: "Tracks" },
      { href: "/reasoning", label: "New exercise" },
    ],
  },
  {
    href: "/geo",
    label: "Labs",
    pages: [
      { href: "/geo", label: "Geo Lab" },
      { href: "/simulators", label: "Simulators" },
      { href: "/briefs", label: "Briefs" },
    ],
  },
  {
    href: "/exercise/history",
    label: "Memory",
    pages: [
      { href: "/exercise/history", label: "Past exercises" },
      { href: "/terms/review", label: "Review terms" },
      { href: "/terms", label: "My terms" },
      { href: "/forecasts", label: "Forecasts" },
    ],
  },
  {
    href: "/handbook",
    label: "Guide",
    pages: [
      { href: "/handbook", label: "Handbook" },
      { href: "/settings", label: "Settings" },
    ],
  },
] as const satisfies readonly NavGroup[];

export interface NavPlace {
  group: NavGroup;
  /** The open page of the group, null when it is not one of its pages. */
  page: NavPage | null;
  /** An exercise being done: shown after Today in the Practice row. */
  exercise?: string;
}

const clean = (pathname: string | null) =>
  (pathname ?? "/").replace(/\/+$/, "") || "/";

/** Where a path sits in the nav: its group, its page, and an open exercise. */
export function navPlace(pathname: string | null): NavPlace {
  const path = clean(pathname);
  const [practice] = NAV_GROUPS;

  // Exact match first: "/terms" and "/terms/review" are both pages.
  for (const group of NAV_GROUPS) {
    const page = group.pages.find((p) => p.href === path);
    if (page) return { group, page };
  }
  for (const group of NAV_GROUPS) {
    const page = group.pages.find(
      (p) => p.href !== "/" && path.startsWith(p.href + "/"),
    );
    if (page) return { group, page };
  }

  const exercise = /^\/exercise\/([^/]+)/.exec(path);
  if (exercise)
    return {
      group: practice,
      page: null,
      exercise: TYPE_LABEL[exercise[1]!] ?? "Exercise",
    };

  return { group: practice, page: practice.pages[0] };
}
