"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { TagType, UserHighlight } from "@/lib/types/exercise";
import {
  GEOPOLITICS_SEMANTIC_ACCENTS,
  isGeopoliticsSemanticTag,
  ANALYTICAL_TAG_OPTIONS,
  TAG_LABELS,
} from "@/lib/exercise/tag-labels";
import { splitSentences, type TextRange } from "@/lib/text/sentences";
import { SemanticTagPicker } from "@/components/exercises/SemanticTagPicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

/** The DOM point at a text offset, walking every text node (marks split the text). */
function pointAt(el: HTMLElement, offset: number): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let node = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (offset <= seen + len) return { node, offset: offset - seen };
    seen += len;
    node = walker.nextNode();
  }
  return null;
}

function rangeRectFromOffsets(
  el: HTMLElement,
  offsets: TextRange,
): DOMRect | null {
  const start = pointAt(el, offsets.start);
  const end = pointAt(el, offsets.end);
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
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
    420,
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

/** What the open picker acts on: a new range, or an existing highlight to change. */
type Pending = { range: TextRange; editingId: string | null };

type PassagePiece = {
  start: number;
  end: number;
  /** The sentence this piece is (sentence mode); null for the space between. */
  sentence: TextRange | null;
  /** The highlight covering this piece, if any. */
  highlight: UserHighlight | null;
};

function highlightOver(highlights: UserHighlight[], r: TextRange): UserHighlight | null {
  return highlights.find((h) => overlaps(r.start, r.end, h.startOffset, h.endOffset)) ?? null;
}

/** Sentence mode: one piece per sentence and per gap between sentences. */
function sentencePieces(passage: string, highlights: UserHighlight[]): PassagePiece[] {
  const pieces: PassagePiece[] = [];
  let at = 0;
  for (const s of splitSentences(passage)) {
    if (s.start > at) pieces.push({ start: at, end: s.start, sentence: null, highlight: null });
    pieces.push({ start: s.start, end: s.end, sentence: s, highlight: highlightOver(highlights, s) });
    at = s.end;
  }
  if (at < passage.length) pieces.push({ start: at, end: passage.length, sentence: null, highlight: null });
  return pieces;
}

/** Free mode: split at highlight edges so highlights show in place. */
function freePieces(passage: string, highlights: UserHighlight[]): PassagePiece[] {
  const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
  const pieces: PassagePiece[] = [];
  let at = 0;
  for (const h of sorted) {
    const start = Math.max(at, h.startOffset);
    const end = Math.min(passage.length, h.endOffset);
    if (end <= start) continue;
    if (start > at) pieces.push({ start: at, end: start, sentence: null, highlight: null });
    pieces.push({ start, end, sentence: null, highlight: h });
    at = end;
  }
  if (at < passage.length) pieces.push({ start: at, end: passage.length, sentence: null, highlight: null });
  return pieces;
}

export interface HighlightTagProps {
  passage: string;
  highlights: UserHighlight[];
  onChange: (next: UserHighlight[]) => void;
  onSelectionOverlap: () => void;
  tagOptions?: TagType[];
  /**
   * "sentence": tap a sentence to tag it (one step, no exact selection needed).
   * "free": select any text, then tap the selection to tag it.
   */
  selectionMode?: "sentence" | "free";
  /** Show the check question under each tag in the picker (hidden at Expert). */
  showQuestions?: boolean;
}

export function HighlightTag({
  passage,
  highlights,
  onChange,
  onSelectionOverlap,
  tagOptions = ANALYTICAL_TAG_OPTIONS,
  selectionMode = "free",
  showQuestions = true,
}: HighlightTagProps) {
  const ref = useRef<HTMLDivElement>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const selectionChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStageAtRef = useRef(0);
  const [staged, setStaged] = useState<TextRange | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const [hintStyle, setHintStyle] = useState<CSSProperties | null>(null);
  const sentenceMode = selectionMode === "sentence";

  const pieces = useMemo(
    () => (sentenceMode ? sentencePieces(passage, highlights) : freePieces(passage, highlights)),
    [sentenceMode, passage, highlights],
  );
  const editing = pending?.editingId
    ? highlights.find((h) => h.id === pending.editingId) ?? null
    : null;

  const updateAnchorPositions = useCallback(
    (offsets: TextRange, forPicker: boolean) => {
      const el = ref.current;
      if (!el) return;
      const anchor = anchorElRef.current?.isConnected
        ? anchorElRef.current.getBoundingClientRect()
        : getAnchorRect(el, offsets);
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
    anchorElRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, []);

  const stageRange = useCallback((range: TextRange) => {
    anchorElRef.current = null;
    setStaged(range);
    setPending(null);
    setPopoverStyle(null);
    lastStageAtRef.current = Date.now();
    updateAnchorPositions(range, false);
  }, [updateAnchorPositions]);

  /** Open the picker for a range, or for an existing highlight when `editingId` is set. */
  const openPicker = useCallback(
    (range: TextRange, editingId: string | null = null, anchorEl: HTMLElement | null = null) => {
      if (!editingId) {
        for (const h of highlights) {
          if (overlaps(range.start, range.end, h.startOffset, h.endOffset)) {
            setPending(null);
            setPopoverStyle(null);
            onSelectionOverlap();
            return;
          }
        }
      }
      anchorElRef.current = anchorEl;
      setPending({ range, editingId });
      setStaged(editingId ? null : range);
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
    if (sentenceMode) return;
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
  }, [sentenceMode, readSelectionDeferred, stageRange]);

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (sentenceMode) return;
    const sel = window.getSelection();
    const markEl = (e.target as HTMLElement).closest<HTMLElement>("[data-highlight-id]");
    // A plain tap on an existing highlight opens it for a tag change.
    if (markEl && (!sel || sel.isCollapsed)) {
      const h = highlights.find((x) => x.id === markEl.dataset.highlightId);
      if (h) {
        openPicker({ start: h.startOffset, end: h.endOffset }, h.id, markEl);
        return;
      }
    }
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
  }, [sentenceMode, highlights, readSelectionDeferred, staged, pending, openPicker, stageRange, clearAll]);

  const onSentence = (piece: PassagePiece, el: HTMLElement) => {
    if (!piece.sentence) return;
    if (piece.highlight) openPicker(piece.sentence, piece.highlight.id, el);
    else openPicker(piece.sentence, null, el);
  };

  useLayoutEffect(() => {
    const offsets = pending?.range ?? staged;
    if (!offsets) return;

    const reposition = () => updateAnchorPositions(offsets, Boolean(pending));

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
    if (pending.editingId) {
      onChange(highlights.map((h) => (h.id === pending.editingId ? { ...h, tag } : h)));
      clearAll();
      return;
    }
    const { start, end } = pending.range;
    onChange([
      ...highlights,
      {
        id: crypto.randomUUID(),
        startOffset: start,
        endOffset: end,
        text: passage.slice(start, end),
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
      aria-label={editing ? "Change the tag" : "Pick a tag for selection"}
      className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
      style={popoverStyle}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="shrink-0 border-b border-zinc-100 px-3 py-2">
        <span className="text-sm text-zinc-500" data-testid="pick-tag-prompt">
          {editing ? "Change the tag:" : "Pick a tag:"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <SemanticTagPicker
          options={tagOptions}
          onSelect={applyTag}
          selected={editing?.tag}
          showQuestions={showQuestions}
          autoFocusFirst
          className="max-h-none"
        />
      </div>
      <div className="flex shrink-0 gap-2 border-t border-zinc-100 p-2">
        {editing ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              remove(editing.id);
              clearAll();
            }}
          >
            Remove
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="flex-1"
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

  const sentenceKeyDown = (piece: PassagePiece) => (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSentence(piece, e.currentTarget);
    }
  };

  return (
    <div className="space-y-4">
      {sentenceMode ? (
        <p className="text-muted-foreground text-sm" data-testid="sentence-mode-hint">
          Tap a sentence to tag it. Tap a tagged sentence to change or remove its tag.
        </p>
      ) : null}
      <div
        ref={ref}
        data-testid="text-passage"
        className={cn(
          "touch-manipulation whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900",
          sentenceMode ? "select-none" : "select-text cursor-text [-webkit-user-select:text]",
        )}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "Escape") clearAll();
        }}
        tabIndex={sentenceMode ? undefined : 0}
      >
        {pieces.map((p) => {
          const text = passage.slice(p.start, p.end);
          if (sentenceMode && p.sentence) {
            const open = pending != null && rangesEqual(pending.range, p.sentence);
            return (
              <span
                key={p.start}
                role="button"
                tabIndex={0}
                aria-pressed={p.highlight != null}
                aria-label={
                  p.highlight ? `${text} (tagged ${TAG_LABELS[p.highlight.tag].label})` : undefined
                }
                data-testid="passage-sentence"
                data-tagged={p.highlight ? "true" : undefined}
                className={cn(
                  "cursor-pointer rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-zinc-900",
                  p.highlight
                    ? "bg-zinc-900/10 underline decoration-zinc-900 decoration-2 underline-offset-4"
                    : "hover:bg-zinc-900/5",
                  open && "bg-zinc-900/15",
                )}
                onClick={(e) => onSentence(p, e.currentTarget)}
                onKeyDown={sentenceKeyDown(p)}
              >
                {text}
              </span>
            );
          }
          if (p.highlight) {
            return (
              <mark
                key={p.start}
                data-highlight-id={p.highlight.id}
                className="cursor-pointer rounded-sm bg-zinc-900/10 text-inherit underline decoration-zinc-900 decoration-2 underline-offset-4"
              >
                {text}
              </mark>
            );
          }
          // Plain text node, so an untouched passage stays a single text node.
          return <Fragment key={p.start}>{text}</Fragment>;
        })}
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
              data-testid="highlight-chip"
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
