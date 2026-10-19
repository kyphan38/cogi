import type { HTMLAttributes, ReactNode } from "react";

/**
 * One group on a page: a small label, an optional word action on the right,
 * then the content. Space separates groups, not a card (DESIGN.md "Layout").
 */
export function HomeSection({
  title,
  action,
  children,
  className,
  ...rest
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section className={className} {...rest}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="section-label">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A secondary action as a plain word. */
export const WORD_LINK =
  "text-muted-foreground text-xs hover:text-foreground active:text-foreground";

/** A forward action inside a group ("Start", "Open"): ink word with a chevron. */
export const GO_LINK =
  "inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-foreground";
