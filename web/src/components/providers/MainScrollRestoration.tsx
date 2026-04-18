"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const storageKey = (pathname: string) => `cogi:scroll:${pathname || "/"}`;

/**
 * Persists window scroll position per pathname in sessionStorage so returning
 * to a route restores vertical scroll.
 */
export function MainScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    const raw = sessionStorage.getItem(storageKey(pathname));
    if (raw != null) {
      const y = Number(raw);
      if (!Number.isNaN(y) && y >= 0) {
        requestAnimationFrame(() => {
          window.scrollTo(0, y);
        });
      }
    }

    return () => {
      sessionStorage.setItem(storageKey(pathname), String(window.scrollY));
    };
  }, [pathname]);

  return null;
}
