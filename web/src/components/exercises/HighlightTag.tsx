"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TagType, UserHighlight } from "@/lib/types/exercise";
import {
  GEOPOLITICS_SEMANTIC_ACCENTS,
  GEOPOLITICS_TAG_OPTIONS,
  isGeopoliticsSemanticTag,
  TAG_LABELS,
  TAG_ORDER,
} from "@/lib/exercise/tag-labels";
import { SemanticTagPicker } from "@/components/exercises/SemanticTagPicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function selectionOffsetsWithin(
  el: HTMLElement,
): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  pre.setEnd(range.endContainer, range.endOffset);
  const end = pre.toString().length;
  if (end <= start) return null;
  return { start, end };
}

function overlaps(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.max(a0, b0) < Math.min(a1, b1);
}

function usesSemanticTagPicker(tagOptions: TagType[]): boolean {
  const geoSet = new Set<TagType>(GEOPOLITICS_TAG_OPTIONS);
  return tagOptions.length > 0 && tagOptions.every((t) => geoSet.has(t));
}

function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function HighlightTagBadge({ tag }: { tag: TagType }) {
  if (isGeopoliticsSemanticTag(tag)) {
    const accent = GEOPOLITICS_SEMANTIC_ACCENTS[tag];
    return (
      <span
        className={cn(
          "mr-2 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
          accent.chipClass,
        )}
      >
        <span
          className={cn("size-2 shrink-0 rounded-full", accent.dotClass)}
          aria-hidden
        />
        {accent.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "mr-2 rounded px-2 py-0.5 text-xs font-medium",
        TAG_LABELS[tag].colorClass,
      )}
    >
      {TAG_LABELS[tag].label}
    </span>
  );
}

export interface HighlightTagProps {
  passage: string;
  highlights: UserHighlight[];
  onChange: (next: UserHighlight[]) => void;
  /** Called when the user selects text that overlaps an existing highlight (replaces window.alert). */
  onSelectionOverlap: () => void;
  /** Subset of tags to show; defaults to TAG_ORDER. */
  tagOptions?: TagType[];
}

export function HighlightTag({
  passage,
  highlights,
  onChange,
  onSelectionOverlap,
  tagOptions = TAG_ORDER,
}: HighlightTagProps) {
  const ref = useRef<HTMLDivElement>(null);
  const firstTagButtonRef = useRef<HTMLButtonElement>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState<{ start: number; end: number } | null>(
    null,
  );

  const semanticPicker = usesSemanticTagPicker(tagOptions);

  useEffect(() => {
    if (!pending || semanticPicker) return;
    firstTagButtonRef.current?.focus();
  }, [pending, semanticPicker]);

  const commitSelectionFromDOM = useCallback(
    (attempt = 0) => {
      const el = ref.current;
      if (!el) return;
      const range = selectionOffsetsWithin(el);
      if (!range || range.end - range.start < 1) {
        if (attempt < 3 && isCoarsePointerDevice()) {
          commitTimerRef.current = setTimeout(
            () => commitSelectionFromDOM(attempt + 1),
            80,
          );
        }
        return;
      }

      window.getSelection()?.removeAllRanges();

      for (const h of highlights) {
        if (overlaps(range.start, range.end, h.startOffset, h.endOffset)) {
          setPending(null);
          onSelectionOverlap();
          return;
        }
      }
      setPending(range);
    },
    [highlights, onSelectionOverlap],
  );

  const scheduleCommitSelection = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    const run = () => commitSelectionFromDOM(0);
    if (isCoarsePointerDevice()) {
      requestAnimationFrame(() => {
        requestAnimationFrame(run);
      });
    } else {
      requestAnimationFrame(run);
    }
  }, [commitSelectionFromDOM]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      if (!anchor || !el.contains(anchor)) return;

      if (selectionChangeTimerRef.current) {
        clearTimeout(selectionChangeTimerRef.current);
      }
      selectionChangeTimerRef.current = setTimeout(() => {
        scheduleCommitSelection();
      }, 120);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (selectionChangeTimerRef.current) {
        clearTimeout(selectionChangeTimerRef.current);
      }
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, [scheduleCommitSelection]);

  const applyTag = (tag: TagType) => {
    if (!pending) return;
    const text = passage.slice(pending.start, pending.end);
    const id = crypto.randomUUID();
    onChange([
      ...highlights,
      {
        id,
        startOffset: pending.start,
        endOffset: pending.end,
        text,
        tag,
      },
    ]);
    setPending(null);
    window.getSelection()?.removeAllRanges();
  };

  const remove = (id: string) => {
    onChange(highlights.filter((h) => h.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        ref={ref}
        data-testid="text-passage"
        className="select-text cursor-text touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900 [-webkit-user-select:text]"
        onPointerUp={scheduleCommitSelection}
        onKeyUp={scheduleCommitSelection}
        onKeyDown={(e) => {
          if (e.key === "Escape") setPending(null);
        }}
        tabIndex={0}
      >
        {passage}
      </div>

      {pending ? (
        <div
          data-testid="tag-picker-region"
          className="space-y-3 rounded-2xl border border-dashed border-zinc-200 p-4"
        >
          <span className="text-sm text-zinc-500" data-testid="pick-tag-prompt">
            Pick a tag:
          </span>
          {semanticPicker ? (
            <SemanticTagPicker options={tagOptions} onSelect={applyTag} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {tagOptions.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className={cn("text-xs", TAG_LABELS[tag].colorClass)}
                  onClick={() => applyTag(tag)}
                  ref={tag === tagOptions[0] ? firstTagButtonRef : undefined}
                >
                  {TAG_LABELS[tag].label}
                </Button>
              ))}
            </div>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>
            Cancel
          </Button>
        </div>
      ) : null}

      {highlights.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {highlights.map((h) => (
            <li
              key={h.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-zinc-200 p-3"
            >
              <div>
                <HighlightTagBadge tag={h.tag} />
                <q className="text-zinc-500">{h.text}</q>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(h.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
