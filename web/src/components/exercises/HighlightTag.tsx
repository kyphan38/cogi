"use client";

import { useCallback, useRef, useState } from "react";
import type { TagType, UserHighlight } from "@/lib/types/exercise";
import { TAG_LABELS, TAG_ORDER } from "@/lib/exercise/tag-labels";
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

export interface HighlightTagProps {
  passage: string;
  highlights: UserHighlight[];
  onChange: (next: UserHighlight[]) => void;
}

export function HighlightTag({ passage, highlights, onChange }: HighlightTagProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{ start: number; end: number } | null>(
    null,
  );

  const onMouseUp = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const range = selectionOffsetsWithin(el);
    window.getSelection()?.removeAllRanges();
    if (!range || range.end - range.start < 1) {
      setPending(null);
      return;
    }
    for (const h of highlights) {
      if (overlaps(range.start, range.end, h.startOffset, h.endOffset)) {
        setPending(null);
        alert("Selection overlaps an existing highlight. Remove or adjust first.");
        return;
      }
    }
    setPending(range);
  }, [highlights]);

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
  };

  const remove = (id: string) => {
    onChange(highlights.filter((h) => h.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        ref={ref}
        className="select-text cursor-text rounded-lg border bg-card p-4 font-serif text-base leading-relaxed"
        onMouseUp={onMouseUp}
      >
        {passage}
      </div>

      {pending ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3">
          <span className="text-muted-foreground text-sm">Pick a tag:</span>
          {TAG_ORDER.map((tag) => (
            <Button
              key={tag}
              type="button"
              size="sm"
              variant="secondary"
              className={cn("text-xs", TAG_LABELS[tag].colorClass)}
              onClick={() => applyTag(tag)}
            >
              {TAG_LABELS[tag].label}
            </Button>
          ))}
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
              className="flex flex-wrap items-start justify-between gap-2 rounded border p-2"
            >
              <div>
                <span
                  className={cn(
                    "mr-2 rounded px-2 py-0.5 text-xs font-medium",
                    TAG_LABELS[h.tag].colorClass,
                  )}
                >
                  {TAG_LABELS[h.tag].label}
                </span>
                <q className="text-muted-foreground">{h.text}</q>
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
