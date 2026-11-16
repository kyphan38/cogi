import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";

export interface NavSection {
  href: string;
  label: string;
}

/** The top places, in nav order (PLAN-refine R4). */
export const NAV_SECTIONS = [
  { href: "/", label: "Today" },
  { href: "/tracks", label: "Explore" },
  { href: "/exercise/history", label: "History" },
  { href: "/handbook", label: "Handbook" },
  { href: "/settings", label: "Settings" },
] as const satisfies readonly NavSection[];

/** Explore holds these pages; each also shows them as tabs. */
export const EXPLORE_PAGES = [
  { href: "/tracks", label: "Tracks" },
  { href: "/geo", label: "Geo Lab" },
  { href: "/simulators", label: "Simulators" },
  { href: "/forecasts", label: "Forecasts" },
  { href: "/briefs", label: "Briefs" },
] as const satisfies readonly NavSection[];

export interface NavPlace {
  section: NavSection;
  /** A page under the section, shown after it in the path. */
  page?: string;
}

/** Where a path sits in the nav: its section, and a page name when deeper. */
export function navPlace(pathname: string | null): NavPlace {
  const [today, explore, history, handbook, settings] = NAV_SECTIONS;
  const path = (pathname ?? "/").replace(/\/+$/, "") || "/";

  const explorePage = EXPLORE_PAGES.find((p) => path === p.href || path.startsWith(p.href + "/"));
  if (explorePage) return { section: explore, page: explorePage.label };

  if (path === "/exercise/history" || path.startsWith("/exercise/history/")) return { section: history };
  if (path === "/terms") return { section: history, page: "My terms" };
  if (path === "/terms/review") return { section: history, page: "Review terms" };
  if (path === "/handbook") return { section: handbook };
  if (path === "/settings") return { section: settings };
  if (path === "/reasoning") return { section: today, page: "New exercise" };
  if (path === "/quick") return { section: today, page: "5-minute question" };

  const exercise = /^\/exercise\/([^/]+)/.exec(path);
  if (exercise) return { section: today, page: TYPE_LABEL[exercise[1]!] ?? "Exercise" };

  return { section: today };
}
