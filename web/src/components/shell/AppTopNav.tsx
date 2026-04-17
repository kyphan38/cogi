"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AI_SECRET_STORAGE_KEY } from "@/lib/api/ai-secret-constants";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/exercise/history", label: "History" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
  { href: "/decisions", label: "Decisions" },
] as const;

function navLinkClass(href: string, pathname: string | null) {
  const active =
    href === "/"
      ? pathname === "/" || pathname === ""
      : pathname === href || (pathname?.startsWith(href + "/") ?? false);
  return cn(
    "shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
    active && "bg-accent/80 font-medium text-accent-foreground",
  );
}

export function AppTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const showDev = process.env.NODE_ENV === "development";

  const signOut = () => {
    try {
      window.localStorage.removeItem(AI_SECRET_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    router.replace("/login");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/80",
        "bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
      )}
    >
      <nav
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-2 sm:gap-2"
        aria-label="Main"
      >
        {links.map(({ href, label }) => (
          <Link key={href} href={href} className={navLinkClass(href, pathname)}>
            {label}
          </Link>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {pathname !== "/login" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2 text-xs sm:text-sm"
              onClick={() => signOut()}
            >
              Sign out
            </Button>
          ) : null}
          {showDev ? (
            <Link
              href="/dev/ai-smoke"
              className={cn(navLinkClass("/dev/ai-smoke", pathname), "text-xs sm:text-sm")}
            >
              AI smoke
            </Link>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
