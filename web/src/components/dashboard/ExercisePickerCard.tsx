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
        "rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50/80",
        recommended && "border-zinc-400 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100/80",
        TrailingIcon && "flex items-center justify-between gap-3 px-4 py-3.5",
        className,
      )}
    >
      <div className={cn(TrailingIcon && "min-w-0 flex-1")}>
        <p
          className={cn(
            "section-label mb-1 text-zinc-500",
            recommended && "text-zinc-800",
          )}
        >
          {label}
          {recommended ? " · best fit" : null}
        </p>
        <p className={cn("text-sm font-medium text-zinc-900", recommended && "text-zinc-950")}>
          {title}
        </p>
        {desc ? (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{desc}</p>
        ) : null}
        {recommended && reason ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 italic">{reason}</p>
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

