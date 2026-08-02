"use client";

import Link from "next/link";
import { GUIDE_SECTIONS } from "@/lib/guide/guide-sections";
import { cn } from "@/lib/utils";

type GuideTableOfContentsProps = {
  className?: string;
  variant?: "sidebar" | "mobile";
};

export function GuideTableOfContents({
  className,
  variant = "sidebar",
}: GuideTableOfContentsProps) {
  const isMobile = variant === "mobile";

  const list = (
    <ul className={cn("space-y-1", isMobile && "columns-1 sm:columns-2")}>
      {GUIDE_SECTIONS.map((section, i) => (
        <li key={section.id}>
          <Link
            href={`#${section.id}`}
            className={cn(
              "block rounded-md px-2 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
              isMobile && "text-xs",
            )}
          >
            <span className="text-muted-foreground mr-1.5 tabular-nums">{i + 1}.</span>
            {section.title}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (isMobile) {
    return (
      <details className={cn("rounded-2xl border border-zinc-200 bg-zinc-50/80 lg:hidden", className)}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-900">
          On this page
        </summary>
        <nav aria-label="Guide contents" className="border-t border-zinc-200 px-3 py-3">
          {list}
        </nav>
      </details>
    );
  }

  return (
    <nav
      aria-label="Guide contents"
      className={cn("hidden lg:block", className)}
    >
      <p className="section-label mb-3">Contents</p>
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
        {list}
      </div>
    </nav>
  );
}
