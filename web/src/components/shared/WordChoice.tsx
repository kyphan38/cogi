"use client";

import { cn } from "@/lib/utils";

/**
 * Pick one of a few options, shown as words: the current one is ink and
 * medium, the others faint (like the Theme row in Settings).
 */
export function WordChoice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "py-1",
            value === o.value ? "font-medium text-foreground" : "text-zinc-500 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
