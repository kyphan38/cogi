"use client";

import { useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const LS_KEY = "cogi:dismissed-domains";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export interface DomainInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function DomainInput({
  value,
  onChange,
  suggestions,
  placeholder = "e.g. DevOps / SRE",
  className,
}: DomainInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = useCallback((s: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(s);
      saveDismissed(next);
      return next;
    });
  }, []);

  const filtered = (value.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase()))
    : suggestions
  ).filter((s) => !dismissed.has(s));

  const visible = filtered.slice(0, 10);

  const select = useCallback(
    (s: string) => {
      onChange(s);
      setOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    if (!open || visible.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      select(visible[highlightedIndex]!);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && visible.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {visible.map((s, i) => (
            <li
              key={s}
              className={cn(
                "group/item flex cursor-default items-center justify-between px-2.5 py-1.5 text-sm",
                i === highlightedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                select(s);
              }}
            >
              <span className="truncate">{s}</span>
              <button
                type="button"
                aria-label={`Remove "${s}" from suggestions`}
                onMouseDown={(e) => dismiss(s, e)}
                className="ml-2 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-foreground"
                tabIndex={-1}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

