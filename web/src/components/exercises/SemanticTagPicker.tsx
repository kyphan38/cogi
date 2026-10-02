"use client";

import { useEffect, useRef } from "react";
import type { TagType } from "@/lib/types/exercise";
import {
  GEOPOLITICS_SEMANTIC_ACCENTS,
  isGeopoliticsSemanticTag,
  TAG_CHECK_QUESTIONS,
  TAG_LABELS,
} from "@/lib/exercise/tag-labels";
import { cn } from "@/lib/utils";

export interface SemanticTagPickerProps {
  options: TagType[];
  onSelect: (tag: TagType) => void;
  /** The tag the highlight already has, when changing it. */
  selected?: TagType;
  /** Move focus to the first option when the picker opens. */
  autoFocusFirst?: boolean;
  /** Show each plain tag's check question (default on). */
  showQuestions?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Tag options as buttons, each with the question behind it ("a yes means this tag
 * fits"), so choosing a tag is answering a question rather than guessing a label.
 */
export function SemanticTagPicker({
  options,
  onSelect,
  selected,
  autoFocusFirst,
  showQuestions = true,
  disabled,
  className,
}: SemanticTagPickerProps) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocusFirst) firstRef.current?.focus();
  }, [autoFocusFirst]);

  return (
    <div
      role="toolbar"
      aria-label="Apply tag to selection"
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2",
        className,
      )}
    >
      {options.map((tag, i) => {
        const geo = isGeopoliticsSemanticTag(tag);
        const label = geo
          ? GEOPOLITICS_SEMANTIC_ACCENTS[tag].label
          : TAG_LABELS[tag].label;
        const question = TAG_CHECK_QUESTIONS[tag];
        const isSelected = selected === tag;

        // Geopolitics keeps its compact dot + label row (expert level); plain tags
        // show the question behind them for beginners.
        return (
          <button
            key={tag}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            disabled={disabled}
            aria-pressed={selected ? isSelected : undefined}
            onClick={() => onSelect(tag)}
            className={cn(
              "flex gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm text-zinc-800 transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50",
              geo ? "items-center" : "flex-col items-start gap-0.5",
              isSelected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white",
            )}
          >
            {geo ? (
              <span
                data-testid="semantic-tag-dot"
                className={cn("size-2 shrink-0 rounded-full", GEOPOLITICS_SEMANTIC_ACCENTS[tag].dotClass)}
                aria-hidden
              />
            ) : null}
            <span className={geo ? undefined : "font-medium"}>{label}</span>
            {!geo && showQuestions && question ? (
              <span className="text-xs font-normal text-zinc-500">{question}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
