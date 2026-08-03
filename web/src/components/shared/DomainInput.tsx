"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import {
  flattenVisibleTreeLeaves,
  getAutoExpandedGroupIds,
  getDomainPickerTree,
  getRandomDomainSuggestion,
  type DomainPickerTreeGroup,
} from "@/lib/exercise/exercise-domain-catalog";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Shuffle, X } from "lucide-react";

const LS_KEY = "cogi:dismissed-domains";
const LS_EXPANDED_KEY = "cogi:domain-tree-expanded";

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

function loadPersistedExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_EXPANDED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function savePersistedExpanded(set: Set<string>) {
  try {
    localStorage.setItem(LS_EXPANDED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function filterRecent(
  items: readonly string[],
  query: string,
  dismissed: Set<string>,
): string[] {
  const q = query.trim().toLowerCase();
  return items.filter(
    (s) => !dismissed.has(s) && (!q || s.toLowerCase().includes(q)),
  );
}

export interface DomainInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Domains from the user's recent exercises (Firestore). */
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
  const [expanded, setExpanded] = useState<Set<string>>(() => loadPersistedExpanded());
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
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

  const historyVisible = useMemo(
    () => filterRecent(suggestions, value, dismissed).slice(0, 12),
    [suggestions, value, dismissed],
  );

  const historySet = useMemo(() => new Set(historyVisible), [historyVisible]);

  const tree = useMemo(
    () =>
      getDomainPickerTree({
        query: value,
        recentDomains: historyVisible,
        dismissed,
        excludeFromCatalog: historySet,
      }),
    [value, historyVisible, dismissed, historySet],
  );

  const isFiltering = value.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    if (isFiltering) {
      setExpanded(getAutoExpandedGroupIds(tree));
      return;
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      if (tree.some((n) => n.id === "recent")) next.add("recent");
      return next;
    });
  }, [open, isFiltering, tree]);

  const selectableItems = useMemo(
    () => flattenVisibleTreeLeaves(tree, expanded),
    [tree, expanded],
  );

  const hasDropdown = tree.length > 0;

  const updateDropdownPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const margin = 12;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(320, Math.max(160, preferBelow ? spaceBelow - gap : spaceAbove - gap));

    setDropdownStyle({
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: preferBelow ? rect.bottom + gap : rect.top - gap - maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition, tree.length]);

  const toggleGroup = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      savePersistedExpanded(next);
      return next;
    });
    setHighlightedIndex(-1);
  }, []);

  const select = useCallback(
    (s: string) => {
      onChange(s);
      setOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  const randomize = useCallback(() => {
    const pick = getRandomDomainSuggestion({ exclude: dismissed, avoid: value });
    if (pick) select(pick);
  }, [dismissed, value, select]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    if (!open || selectableItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % selectableItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) =>
        i <= 0 ? selectableItems.length - 1 : i - 1,
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      select(selectableItems[highlightedIndex]!);
    }
  };

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const active = listRef.current.querySelector("[data-domain-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  let leafIndex = 0;

  const renderDomainLeaf = (domain: string, depth: number) => {
    const index = leafIndex++;
    const active = index === highlightedIndex;
    return (
      <li
        key={`${domain}-${index}`}
        data-domain-active={active ? "true" : undefined}
        className={cn(
          "group/item flex cursor-default items-center justify-between py-1.5 pr-2.5 text-sm",
          active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
        )}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onMouseDown={(e) => {
          e.preventDefault();
          select(domain);
        }}
      >
        <span className="truncate">{domain}</span>
        <button
          type="button"
          aria-label={`Remove "${domain}" from suggestions`}
          onMouseDown={(e) => dismiss(domain, e)}
          className="ml-2 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-foreground"
          tabIndex={-1}
        >
          <X className="size-3" aria-hidden />
        </button>
      </li>
    );
  };

  const renderGroup = (group: DomainPickerTreeGroup, depth: number): ReactNode => {
    const isExpanded = expanded.has(group.id);
    const childCount =
      group.domains.length +
      (group.children?.reduce((n, c) => n + c.domains.length, 0) ?? 0);

    return (
      <li key={group.id} className="list-none">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1.5 py-1.5 pr-2.5 text-left text-sm font-medium",
            depth === 0 ? "text-foreground" : "text-muted-foreground",
          )}
          style={{ paddingLeft: `${6 + depth * 14}px` }}
          aria-expanded={isExpanded}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleGroup(group.id);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 opacity-70" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
            {childCount}
          </span>
        </button>
        {isExpanded ? (
          <ul className="list-none">
            {group.domains.map((d) => renderDomainLeaf(d, depth + 1))}
            {group.children?.map((child) => renderGroup(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  const dropdown =
    open && hasDropdown && dropdownStyle ? (
      <ul
        ref={listRef}
        data-testid="domain-suggestions-list"
        role="tree"
        className="fixed z-[200] overflow-y-auto overscroll-contain rounded-lg bg-popover py-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        style={{
          top: dropdownStyle.top,
          left: dropdownStyle.left,
          width: dropdownStyle.width,
          maxHeight: dropdownStyle.maxHeight,
        }}
      >
        {!isFiltering ? (
          <li className="list-none px-3 py-1.5 text-xs text-muted-foreground">
            Expand a group to browse all domains
          </li>
        ) : null}
        {tree.map((group) => renderGroup(group, 0))}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative flex items-center gap-1.5", className)}>
      <Input
        ref={inputRef}
        aria-label="Domain"
        aria-expanded={open && hasDropdown}
        aria-haspopup="tree"
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
        className="min-w-0 flex-1"
      />
      <button
        type="button"
        aria-label="Shuffle topic"
        title="Pick a random domain / topic"
        onMouseDown={(e) => {
          e.preventDefault();
          randomize();
        }}
        className="flex shrink-0 items-center justify-center rounded-md border border-input p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Shuffle className="size-4" aria-hidden />
      </button>
      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
