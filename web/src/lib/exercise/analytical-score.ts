import type {
  AnalyticalResult,
  EmbeddedIssue,
  TagType,
  UserHighlight,
  ValidPoint,
} from "@/lib/types/exercise";
import { findSegmentRange } from "@/lib/text/segment-match";

type Range = { start: number; end: number };

/** Tags that say "this is a problem" (everything except Valid Point and Unclear). */
function isIssueTag(tag: TagType): boolean {
  return tag !== "valid_point" && tag !== "unclear";
}

function overlapLength(a: Range, b: Range): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

/**
 * The sentence around `index`: from just after the previous sentence end (or line
 * break) to the next one. "3.5" is not a sentence end, since a dot must be followed by
 * whitespace.
 */
export function sentenceRangeAt(passage: string, index: number): Range {
  // Text just before position `i` ends a sentence: ".", "!" or "?", maybe a closing quote.
  const endsSentenceBefore = (i: number) =>
    /[.!?]["'”’)\]]?$/.test(passage.slice(Math.max(0, i - 2), i));

  let start = index;
  while (start > 0) {
    const prev = passage[start - 1]!;
    if (prev === "\n" || (/\s/.test(prev) && endsSentenceBefore(start - 1))) break;
    start--;
  }
  let end = index;
  while (end < passage.length && passage[end] !== "\n") {
    end++;
    if (endsSentenceBefore(end) && (end === passage.length || /\s/.test(passage[end]!))) break;
  }
  return { start, end };
}

/**
 * A highlight matches a target (an embedded issue or a decoy) when it covers at least
 * half of the target, or when it sits inside the target's sentence and touches the
 * target (the user picked a different part of the same sentence).
 */
function matches(h: Range, target: Range, sentence: Range): boolean {
  const len = target.end - target.start;
  if (len > 0 && overlapLength(h, target) * 2 >= len) return true;
  const insideSentence = h.start >= sentence.start && h.end <= sentence.end;
  return insideSentence && overlapLength(h, sentence) > 0;
}

type Target = { range: Range; sentence: Range } | null;

function locate(passage: string, segment: string): Target {
  const found = findSegmentRange(passage, segment);
  if (!found) return null;
  const range = { start: found[0], end: found[1] };
  const first = sentenceRangeAt(passage, range.start);
  const last = sentenceRangeAt(passage, Math.max(range.start, range.end - 1));
  return { range, sentence: { start: first.start, end: last.end } };
}

/**
 * Best highlight for a target: one whose tag says "problem" wins over one that does
 * not, then the larger overlap.
 */
function bestMatch(
  target: Target,
  highlights: UserHighlight[],
): UserHighlight | null {
  if (!target) return null;
  let best: UserHighlight | null = null;
  let bestKey = -1;
  for (const h of highlights) {
    const r = { start: h.startOffset, end: h.endOffset };
    if (!matches(r, target.range, target.sentence)) continue;
    const key = (isIssueTag(h.tag) ? 1_000_000 : 0) + overlapLength(r, target.range);
    if (key > bestKey) {
      best = h;
      bestKey = key;
    }
  }
  return best;
}

/**
 * Score the user's highlights against the answer key, in code. The AI feedback is
 * given this result to explain; it does not judge right or wrong itself.
 */
export function scoreAnalytical(input: {
  passage: string;
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  highlights: UserHighlight[];
}): AnalyticalResult {
  const { passage, highlights } = input;
  const used = new Set<string>();

  const issues = input.embeddedIssues.map((issue, index) => {
    const h = bestMatch(locate(passage, issue.textSegment), highlights);
    if (h) used.add(h.id);
    const found = h != null && isIssueTag(h.tag);
    return {
      index,
      type: issue.type,
      severity: issue.severity,
      highlightId: h?.id ?? null,
      userTag: h?.tag ?? null,
      found,
      tagCorrect: found && h.tag === issue.type,
    };
  });

  const decoys = input.validPoints.map((_, index) => {
    const h = bestMatch(locate(passage, input.validPoints[index]!.textSegment), highlights);
    if (h) used.add(h.id);
    return {
      index,
      highlightId: h?.id ?? null,
      userTag: h?.tag ?? null,
      trapped: h != null && isIssueTag(h.tag),
    };
  });

  return {
    issues,
    decoys,
    extraHighlightIds: highlights.filter((h) => !used.has(h.id)).map((h) => h.id),
    found: issues.filter((i) => i.found).length,
    total: issues.length,
    tagsCorrect: issues.filter((i) => i.tagCorrect).length,
    trapsHit: decoys.filter((d) => d.trapped).length,
    decoyTotal: decoys.length,
  };
}
