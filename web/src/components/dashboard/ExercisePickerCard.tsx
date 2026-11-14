"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function ExercisePickerCard({
  href,
  label,
  title,
  desc,
  recommended,
  reason,
  trailingIcon: TrailingIcon,
  className,
  onClick,
}: {
  href: string;
  label: string;
  title: string;
  desc?: string;
  recommended?: boolean;
  reason?: string;
  trailingIcon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-[color,background-color,border-color,scale] duration-150 hover:border-input hover:bg-muted/80 active:scale-[0.99]",
        recommended && "border-foreground/40 bg-muted hover:border-faint hover:bg-muted/80",
        TrailingIcon && "flex items-center justify-between gap-3 px-4 py-3.5",
        className,
      )}
    >
      <div className={cn(TrailingIcon && "min-w-0 flex-1")}>
        <p
          className={cn(
            "section-label mb-1 text-faint",
            recommended && "text-foreground",
          )}
        >
          {label}
          {recommended ? " · best fit" : null}
        </p>
        <p className={cn("text-body font-medium text-foreground", recommended && "text-foreground")}>
          {title}
        </p>
        {desc ? (
          <p className="text-muted-foreground mt-1 text-meta leading-relaxed">{desc}</p>
        ) : null}
        {reason ? (
          <p className="mt-1 text-meta leading-relaxed text-muted-foreground italic">{reason}</p>
        ) : null}
      </div>
      {TrailingIcon ? (
        <TrailingIcon
          className="pointer-events-none size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

