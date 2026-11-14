"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_SECTIONS, navPlace } from "@/lib/nav/place";

/**
 * cogi's own nav (DESIGN.md "Nav: one signature per app"): a path on the
 * left, `cogi / Today / Evaluative`, and the other places as plain sans words
 * on the right. The last part of the path is the current place: ink, medium.
 * Below 420px the path is just the section.
 * Sign out lives in Settings.
 */
export function AppTopNav() {
  const pathname = usePathname();
  const { section, page } = navPlace(pathname);
  const others = NAV_SECTIONS.filter((s) => s.href !== section.href);

  return (
    <header className="mx-auto w-full max-w-3xl px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
      <nav
        className="flex min-h-10 items-baseline justify-between gap-4 text-sm"
        aria-label="Main"
      >
        <div className="flex min-w-0 items-baseline gap-1.5">
          {/* The app name gives way on narrow phones so the row fits at 360px. */}
          <Link
            href="/"
            className="hidden py-2 text-muted-foreground transition-colors duration-150 hover:text-foreground min-[420px]:inline"
          >
            cogi
          </Link>
          <span className="hidden text-muted-foreground/60 min-[420px]:inline" aria-hidden>
            /
          </span>
          <Link
            href={section.href}
            aria-current={page ? undefined : "page"}
            className={
              page
                ? "shrink-0 py-2 font-medium text-foreground min-[420px]:font-normal"
                : "truncate py-2 font-medium text-foreground"
            }
          >
            {section.label}
          </Link>
          {/* On narrow phones only the section shows; the page title says the rest. */}
          {page ? (
            <>
              <span className="hidden text-muted-foreground/60 min-[420px]:inline" aria-hidden>
                /
              </span>
              <span aria-current="page" className="hidden min-w-0 truncate py-2 font-medium text-foreground min-[420px]:inline">
                {page}
              </span>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-baseline gap-3 text-meta sm:gap-4">
          {others.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="py-2 text-muted-foreground transition-colors duration-150 hover:text-foreground active:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
