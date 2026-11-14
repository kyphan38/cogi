"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Practice" },
  { href: "/exercise/history", label: "History" },
  { href: "/handbook", label: "Handbook" },
  { href: "/settings", label: "Settings" },
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
 * cogi's own nav (DESIGN.md "Nav: one signature per app"): a path on the
 * left, `cogi / Practice`, and the other places as plain sans words on the
 * right. Sign out lives in Settings.
 */
export function AppTopNav() {
  const pathname = usePathname();
  const current = links.find((l) => isActive(l.href, pathname)) ?? links[0];
  const others = links.filter((l) => l !== current);

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
            href={current.href}
            aria-current="page"
            className="truncate py-2 font-medium text-foreground"
          >
            {current.label}
          </Link>
        </div>
        <div className="flex shrink-0 items-baseline gap-4 text-[13px]">
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
