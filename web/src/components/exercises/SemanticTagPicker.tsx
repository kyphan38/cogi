"use client";

import type { TagType } from "@/lib/types/exercise";
import {
  GEOPOLITICS_SEMANTIC_ACCENTS,
  isGeopoliticsSemanticTag,
  TAG_LABELS,
} from "@/lib/exercise/tag-labels";
import { cn } from "@/lib/utils";

export interface SemanticTagPickerProps {
  options: TagType[];
  onSelect: (tag: TagType) => void;
  disabled?: boolean;
  className?: string;
}

export function SemanticTagPicker({
  options,
  onSelect,
  disabled,
  className,
}: SemanticTagPickerProps) {
  return (
    <div
      role="toolbar"
      aria-label="Apply tag to selection"
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2",
        className,
      )}
    >
      {options.map((tag) => {
        const geo = isGeopoliticsSemanticTag(tag);
        const label = geo
          ? GEOPOLITICS_SEMANTIC_ACCENTS[tag].label
          : TAG_LABELS[tag].label;
        const dotClass = geo
          ? GEOPOLITICS_SEMANTIC_ACCENTS[tag].dotClass
          : "bg-zinc-400";

        return (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(tag)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-zinc-800 transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <span
              data-testid="semantic-tag-dot"
              className={cn("size-2 shrink-0 rounded-full", dotClass)}
              aria-hidden
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
