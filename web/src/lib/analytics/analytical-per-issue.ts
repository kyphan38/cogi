import type { EmbeddedIssue, UserHighlight } from "@/lib/types/exercise";

function spanIoU(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  const i0 = Math.max(a0, b0);
  const i1 = Math.min(a1, b1);
  if (i1 <= i0) return 0;
  const inter = i1 - i0;
  const union = a1 - a0 + b1 - b0 - inter;
  return union > 0 ? inter / union : 0;
}

function findSegmentRange(passage: string, segment: string): [number, number] | null {
  const idx = passage.indexOf(segment);
  if (idx === -1) return null;
  return [idx, idx + segment.length];
}

/**
 * Same per-issue blend as `computeAnalyticalAccuracy` (70% span IoU + 30% tag),
 * without the global decoy boost — used for weakness hit/miss per issue.
 */
export function scoreEmbeddedIssueCatch(
  passage: string,
  issue: EmbeddedIssue,
  highlights: UserHighlight[],
): number {
  const range = findSegmentRange(passage, issue.textSegment);
  if (!range) return 0;
  const [i0, i1] = range;
  let bestIoU = 0;
  let bestTagMatch = false;
  for (const h of highlights) {
    const iou = spanIoU(i0, i1, h.startOffset, h.endOffset);
    if (iou > bestIoU) {
      bestIoU = iou;
      bestTagMatch = h.tag === issue.type;
    }
  }
  const spanPart = Math.min(1, bestIoU) * 100;
  let tagPart = 0;
  if (bestTagMatch) tagPart = 100;
  else if (bestIoU >= 0.5) tagPart = 50;
  return Math.round(0.7 * spanPart + 0.3 * tagPart);
}
