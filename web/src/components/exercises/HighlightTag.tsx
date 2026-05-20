"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
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

type TextRange = { start: number; end: number };

function selectionOffsetsWithin(el: HTMLElement): TextRange | null {
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

function rangesEqual(a: TextRange, b: TextRange): boolean {
  return a.start === b.start && a.end === b.end;
}

function overlaps(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.max(a0, b0) < Math.min(a1, b1);
}

function usesSemanticTagPicker(tagOptions: TagType[]): boolean {
  const geoSet = new Set<TagType>(GEOPOLITICS_TAG_OPTIONS);
  return tagOptions.length > 0 && tagOptions.every((t) => geoSet.has(t));
}

function rangeRectFromOffsets(
  el: HTMLElement,
  offsets: TextRange,
): DOMRect | null {
  const textNode = el.firstChild;
  if (textNode?.nodeType !== Node.TEXT_NODE) return null;
  const text = textNode.textContent ?? "";
  const start = Math.min(offsets.start, text.length);
  const end = Math.min(offsets.end, text.length);
  if (end <= start) return null;
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  return range.getBoundingClientRect();
}

function getAnchorRect(
  el: HTMLElement,
  offsets: TextRange,
): DOMRect | null {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const live = sel.getRangeAt(0);
    if (el.contains(live.commonAncestorContainer)) {
      const rect = live.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) return rect;
    }
  }
  return rangeRectFromOffsets(el, offsets);
}

function computeFloatingPosition(
  anchor: DOMRect,
  panelHeightEstimate = 280,
): CSSProperties {
  const margin = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = Math.min(360, viewportW - margin * 2);
  let left = anchor.left + anchor.width / 2 - width / 2;
  left = Math.max(margin, Math.min(left, viewportW - width - margin));

  const spaceBelow = viewportH - anchor.bottom - margin;
  const spaceAbove = anchor.top - margin;
  const placeBelow =
    spaceBelow >= Math.min(panelHeightEstimate, 160) || spaceBelow >= spaceAbove;

  const maxHeight = Math.min(
    320,
    Math.max(120, (placeBelow ? spaceBelow : spaceAbove) - margin),
  );

  if (placeBelow) {
    return {
      position: "fixed",
      top: anchor.bottom + margin,
      left,
      width,
      maxHeight,
    };
  }

  return {
    position: "fixed",
    top: Math.max(margin, anchor.top - margin - maxHeight),
    left,
    width,
    maxHeight,
  };
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
  onSelectionOverlap: () => void;
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
  const selectionChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStageAtRef = useRef(0);

  const [staged, setStaged] = useState<TextRange | null>(null);
  const [pending, setPending] = useState<TextRange | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const [hintStyle, setHintStyle] = useState<CSSProperties | null>(null);

  const semanticPicker = usesSemanticTagPicker(tagOptions);

  const updateAnchorPositions = useCallback(
    (offsets: TextRange, forPicker: boolean) => {
      const el = ref.current;
      if (!el) return;
      const anchor = getAnchorRect(el, offsets);
      if (!anchor) return;
      if (forPicker) {
        setPopoverStyle(computeFloatingPosition(anchor));
        setHintStyle(null);
      } else {
        const hintPos = computeFloatingPosition(anchor, 40);
        setHintStyle({
          ...hintPos,
          maxHeight: undefined,
          top: hintPos.top,
        });
        setPopoverStyle(null);
      }
    },
    [],
  );

  const clearAll = useCallback(() => {
    setStaged(null);
    setPending(null);
    setPopoverStyle(null);
    setHintStyle(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const stageRange = useCallback((range: TextRange) => {
    setStaged(range);
    setPending(null);
    setPopoverStyle(null);
    lastStageAtRef.current = Date.now();
    updateAnchorPositions(range, false);
  }, [updateAnchorPositions]);

  const openPicker = useCallback(
    (range: TextRange) => {
      for (const h of highlights) {
        if (overlaps(range.start, range.end, h.startOffset, h.endOffset)) {
          setPending(null);
          setPopoverStyle(null);
          onSelectionOverlap();
          return;
        }
      }
      setPending(range);
      setStaged(range);
      updateAnchorPositions(range, true);
    },
    [highlights, onSelectionOverlap, updateAnchorPositions],
  );

  const readSelectionDeferred = useCallback(
    (onRead: (range: TextRange | null) => void) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = ref.current;
          if (!el) {
            onRead(null);
            return;
          }
          onRead(selectionOffsetsWithin(el));
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!pending || semanticPicker) return;
    firstTagButtonRef.current?.focus();
  }, [pending, semanticPicker]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      if (!anchor || !el.contains(anchor)) {
        if (sel.isCollapsed) {
          setStaged(null);
          setPending(null);
          setHintStyle(null);
          setPopoverStyle(null);
        }
        return;
      }

      if (sel.isCollapsed) return;

      if (selectionChangeTimerRef.current) {
        clearTimeout(selectionChangeTimerRef.current);
      }
      selectionChangeTimerRef.current = setTimeout(() => {
        readSelectionDeferred((range) => {
          if (range) stageRange(range);
        });
      }, 120);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (selectionChangeTimerRef.current) {
        clearTimeout(selectionChangeTimerRef.current);
      }
    };
  }, [readSelectionDeferred, stageRange]);

  const onPointerUp = useCallback(() => {
    readSelectionDeferred((range) => {
      if (!range) {
        if (!pending) clearAll();
        return;
      }

      if (Date.now() - lastStageAtRef.current < 350) {
        return;
      }

      if (staged && rangesEqual(staged, range)) {
        openPicker(range);
        return;
      }

      stageRange(range);
    });
  }, [readSelectionDeferred, staged, pending, openPicker, stageRange, clearAll]);

  useLayoutEffect(() => {
    if (!pending && !staged) return;

    const reposition = () => {
      const offsets = pending ?? staged;
      if (!offsets) return;
      updateAnchorPositions(offsets, Boolean(pending));
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [pending, staged, updateAnchorPositions]);

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
    clearAll();
  };

  const remove = (id: string) => {
    onChange(highlights.filter((h) => h.id !== id));
  };

  const pickerPanel = pending && popoverStyle ? (
    <div
      data-testid="tag-picker-region"
      role="dialog"
      aria-label="Pick a tag for selection"
      className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
      style={popoverStyle}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="shrink-0 border-b border-zinc-100 px-3 py-2">
        <span className="text-sm text-zinc-500" data-testid="pick-tag-prompt">
          Pick a tag:
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {semanticPicker ? (
          <SemanticTagPicker
            options={tagOptions}
            onSelect={applyTag}
            className="max-h-none"
          />
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
      </div>
      <div className="shrink-0 border-t border-zinc-100 p-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => clearAll()}
        >
          Cancel
        </Button>
      </div>
    </div>
  ) : null;

  const hintChip =
    staged && !pending && hintStyle ? (
      <div
        data-testid="tag-selection-hint"
        className="pointer-events-none fixed z-[199] rounded-full border border-zinc-200 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-md"
        style={hintStyle}
      >
        Tap selection to tag
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <div
        ref={ref}
        data-testid="text-passage"
        className="select-text cursor-text touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900 [-webkit-user-select:text]"
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "Escape") clearAll();
        }}
        tabIndex={0}
      >
        {passage}
      </div>

      {typeof document !== "undefined" && pickerPanel
        ? createPortal(pickerPanel, document.body)
        : null}
      {typeof document !== "undefined" && hintChip
        ? createPortal(hintChip, document.body)
        : null}

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
