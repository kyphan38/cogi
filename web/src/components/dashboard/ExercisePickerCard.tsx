"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function ExercisePickerCard({
  href,
  label,
  title,
  desc,
  primary,
  trailingIcon: TrailingIcon,
  className,
}: {
  href: string;
  label: string;
  title: string;
  desc?: string;
  primary?: boolean;
  trailingIcon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/35 hover:bg-muted/20",
        primary && "border-primary/35 bg-accent/50 hover:border-primary/45 hover:bg-accent/60",
        TrailingIcon && "flex items-center justify-between gap-3 px-4 py-3.5",
        className,
      )}
    >
      <div className={cn(TrailingIcon && "min-w-0 flex-1")}>
        <p
          className={cn(
            "mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
            primary && "text-primary",
          )}
        >
          {label}
          {primary ? " · suggested today" : null}
        </p>
        <p className={cn("text-sm font-medium", primary && "text-primary")}>{title}</p>
        {desc ? (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{desc}</p>
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

