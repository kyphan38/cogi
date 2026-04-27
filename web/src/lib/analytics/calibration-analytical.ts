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
 * Phase 1.3b analytical row: 70% span (IoU vs best highlight) + 30% tag match,
 * averaged per embedded issue; decoys handled softly (valid_point overlap).
 */
export function computeAnalyticalAccuracy(
  passage: string,
  embeddedIssues: EmbeddedIssue[],
  validPoints: { textSegment: string }[],
  highlights: UserHighlight[],
  isSoundReasoning: boolean = false,
): number {
  if (isSoundReasoning) {
    let score = 100;
    for (const h of highlights) {
      if (
        h.tag === "logical_fallacy" ||
        h.tag === "hidden_assumption" ||
        h.tag === "weak_evidence" ||
        h.tag === "bias"
      ) {
        score -= 12;
      }
    }
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  if (embeddedIssues.length === 0) return 0;

  let sum = 0;
  for (const issue of embeddedIssues) {
    const range = findSegmentRange(passage, issue.textSegment);
    if (!range) {
      sum += 0;
      continue;
    }
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
    sum += 0.7 * spanPart + 0.3 * tagPart;
  }
  let avg = sum / embeddedIssues.length;

  // Decoys: small boost if user marks valid_point on decoy spans (no hard penalty for wrong issue tags on decoys in MVP)
  for (const vp of validPoints) {
    const range = findSegmentRange(passage, vp.textSegment);
    if (!range) continue;
    const [i0, i1] = range;
    for (const h of highlights) {
      if (h.tag !== "valid_point") continue;
      const iou = spanIoU(i0, i1, h.startOffset, h.endOffset);
      if (iou >= 0.5) {
        avg = Math.min(100, avg + 2);
        break;
      }
    }
  }

  return Math.round(Math.min(100, Math.max(0, avg)));
}
