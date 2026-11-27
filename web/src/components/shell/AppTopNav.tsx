"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_GROUPS, navPlace } from "@/lib/nav/place";
import { cn } from "@/lib/utils";

const word =
  "transition-colors duration-150 hover:text-foreground active:text-foreground";

/**
 * cogi's own nav (DESIGN.md "Nav: one signature per app", PLAN-guide G1).
 * Row 1: `cogi` on the left and the four groups in the middle; the open group is
 * ink, medium. Row 2: the pages of the open group, centered; the open page is ink,
 * medium. An exercise being done sits after Today. Phones drop the app name and
 * let row 2 scroll sideways. Sign out lives in Settings.
 */
export function AppTopNav() {
  const { group, page, exercise } = navPlace(usePathname());

  const rows = group.pages.flatMap((p) =>
    exercise && p.href === "/"
      ? [
          { ...p, current: false },
          { href: null, label: exercise, current: true },
        ]
      : [{ ...p, current: p.href === page?.href }],
  );

  return (
    <header className="mx-auto w-full max-w-3xl px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
      <nav aria-label="Main" className="text-sm">
        <div className="grid min-h-10 grid-cols-[1fr_auto_1fr] items-baseline">
          <Link
            href="/"
            className={cn(
              "hidden py-2 font-semibold text-foreground sm:inline",
              word,
            )}
          >
            cogi
          </Link>
          <div className="col-start-2 flex items-baseline gap-5 sm:gap-7">
            {NAV_GROUPS.map((g) => (
              <Link
                key={g.label}
                href={g.href}
                className={cn(
                  "py-2",
                  word,
                  g.label === group.label
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {g.label}
              </Link>
            ))}
          </div>
        </div>
        <div
          className="-mx-4 flex gap-x-5 overflow-x-auto border-b border-border px-4 pb-2.5 text-meta whitespace-nowrap [scrollbar-width:none] sm:mx-0 sm:justify-center sm:px-0"
          data-testid="group-pages"
        >
          {rows.map((r) =>
            r.href === null ? (
              <span
                key={r.label}
                aria-current="page"
                className="py-1 font-medium text-foreground"
              >
                {r.label}
              </span>
            ) : (
              <Link
                key={r.href}
                href={r.href}
                aria-current={r.current ? "page" : undefined}
                className={cn(
                  "py-1",
                  word,
                  r.current
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {r.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </header>
  );
}
