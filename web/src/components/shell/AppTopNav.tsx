"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "practice" },
  { href: "/exercise/history", label: "history" },
  { href: "/handbook", label: "handbook" },
  { href: "/settings", label: "settings" },
] as const;

/** Practice covers the start page, the exercise picker and exercises in progress. */
function isPracticePath(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return true;
  if (pathname === "/reasoning") return true;
  return (
    pathname.startsWith("/exercise/") &&
    !pathname.startsWith("/exercise/history")
  );
}

function isActive(href: string, pathname: string | null): boolean {
  return href === "/"
    ? isPracticePath(pathname)
    : pathname === href || (pathname?.startsWith(href + "/") ?? false);
}

/**
 * Words instead of tabs (DESIGN.md "Layout", hodi TopBar): app name on the
 * left, a few faint words on the right, the current one in ink.
 * Sign out lives in Settings.
 */
export function AppTopNav() {
  const pathname = usePathname();

  return (
    <header className="mx-auto w-full max-w-3xl px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
      <nav
        className="flex min-h-8 items-baseline justify-between gap-4 font-mono text-[11px] text-muted-foreground"
        aria-label="Main"
      >
        {/* The name gives way on narrow phones so the four words fit at 360px. */}
        <Link
          href="/"
          className="hidden py-2 uppercase tracking-[0.1em] hover:text-foreground min-[420px]:inline"
        >
          cogi
        </Link>
        <div className="ml-auto flex min-w-0 items-baseline tracking-[0.04em]">
          {links.map(({ href, label }, i) => {
            const active = isActive(href, pathname);
            return (
              <Fragment key={href}>
                {i > 0 && (
                  <span className="px-1.5" aria-hidden>
                    ·
                  </span>
                )}
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "py-2 transition-colors duration-150 hover:text-foreground",
                    active && "font-medium text-foreground",
                  )}
                >
                  {label}
                </Link>
              </Fragment>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
