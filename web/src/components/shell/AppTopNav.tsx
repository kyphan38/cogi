"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { awaitRouterReplace } from "@/lib/nav/await-router-replace";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Practice" },
  { href: "/exercise/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/handbook", label: "Handbook" },
] as const;

/** Practice covers the start page, the exercise picker and exercises in progress. */
function isPracticePath(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return true;
  if (pathname === "/reasoning") return true;
  return pathname.startsWith("/exercise/") && !pathname.startsWith("/exercise/history");
}

function navLinkClass(href: string, pathname: string | null) {
  const active =
    href === "/"
      ? isPracticePath(pathname)
      : pathname === href || (pathname?.startsWith(href + "/") ?? false);
  return cn(
    // Tighter on phones so four tabs and Sign out fit a 360px screen.
    "shrink-0 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:px-2.5",
    active && "bg-zinc-100 font-medium text-zinc-900",
  );
}

export function AppTopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const onSignOut = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch (e) {
      if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError")
        return;
      // Session cookie cleanup is best-effort.
    }
    await signOut(getFirebaseAuth());
    await awaitRouterReplace(router, "/login");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/80",
        "bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
      )}
    >
      <nav
        className="mx-auto flex max-w-5xl items-center gap-0.5 px-3 py-2 sm:gap-2 sm:px-4"
        aria-label="Main"
      >
        {/* Scrolls sideways instead of pushing Sign out off screen on very narrow phones. */}
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className={navLinkClass(href, pathname)}>
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8 px-2 text-xs sm:text-sm"
            onClick={() => void onSignOut()}
          >
            Sign out
          </Button>
        </div>
      </nav>
    </header>
  );
}
