"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { EXPLORE_PAGES, navPlace } from "@/lib/nav/place";
import { cn } from "@/lib/utils";

/** The pages under Explore as words: the current one ink and medium. */
export function ExploreTabs() {
  const { page } = navPlace(usePathname());
  return (
    <nav aria-label="Explore" className="flex flex-wrap gap-x-5 gap-y-1 text-body" data-testid="explore-tabs">
      {EXPLORE_PAGES.map(({ href, label }) => {
        const current = label === page;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "py-1 transition-colors duration-150",
              current ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground active:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
