import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one page title pattern: title, an optional one-line sub, and an
 * optional action on the right (PLAN-refine R1).
 */
export function PageHeader({
  title,
  sub,
  action,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-page text-foreground">{title}</h1>
        {sub ? <p className="mt-1 text-body text-muted-foreground">{sub}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </header>
  );
}
