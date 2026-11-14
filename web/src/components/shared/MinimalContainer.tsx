import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MinimalContainerProps {
  title?: ReactNode;
  description?: ReactNode;
  headerAside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** E2E layout tests */
  "data-testid"?: string;
}

export interface MinimalContainerActionProps {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

// Same look as Button: filled main action, plain word for the rest.
const actionVariants = {
  primary: buttonVariants(),
  secondary: buttonVariants({ variant: "secondary" }),
} as const;

export function MinimalContainerAction({
  label,
  onClick,
  href,
  variant = "primary",
  type = "button",
  disabled,
  className,
}: MinimalContainerActionProps) {
  const classes = cn(actionVariants[variant], className);

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {label}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export function MinimalContainerFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MinimalContainer({
  title,
  description,
  headerAside,
  children,
  footer,
  className,
  bodyClassName,
  "data-testid": dataTestId,
}: MinimalContainerProps) {
  const hasHeader = title != null || description != null || headerAside != null;

  return (
    <div
      data-testid={dataTestId}
      // A step is a section held by space, not a frame (DESIGN.md "Layout").
      className={cn("flex flex-col gap-6", className)}
    >
      {hasHeader ? (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            {title != null ? (
              <h2 className="text-lead text-foreground">{title}</h2>
            ) : null}
            {description != null ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {headerAside ? (
            <div className="shrink-0">{headerAside}</div>
          ) : null}
        </header>
      ) : null}
      <div
        data-testid={dataTestId ? `${dataTestId}-body` : undefined}
        className={bodyClassName}
      >
        {children}
      </div>
      {footer ? (
        typeof footer === "string" ? (
          <footer className="border-t border-border pt-4">
            {footer}
          </footer>
        ) : (
          footer
        )
      ) : null}
    </div>
  );
}
