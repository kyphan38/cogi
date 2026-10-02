import type {
  AnalyticalResult,
  EmbeddedIssue,
  IssueSeverity,
  UserHighlight,
  ValidPoint,
} from "@/lib/types/exercise";
import { findSegmentRange } from "@/lib/text/segment-match";

const SEVERITY_ORDER: Record<IssueSeverity, number> = { obvious: 0, moderate: 1, subtle: 2 };

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  obvious: "Easy to spot",
  moderate: "Medium",
  subtle: "Hard to spot",
};

/**
 * Issues in reading order for the answer key: easiest first, then by position in the
 * passage. `marker` is the number shown both in the list and in the passage.
 */
export function orderedIssues(
  result: AnalyticalResult,
  embeddedIssues: EmbeddedIssue[],
  passage: string,
): { outcome: AnalyticalResult["issues"][number]; issue: EmbeddedIssue; marker: string }[] {
  const pos = (i: EmbeddedIssue) => findSegmentRange(passage, i.textSegment)?.[0] ?? Infinity;
  return result.issues
    .map((outcome) => ({ outcome, issue: embeddedIssues[outcome.index]! }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity] ||
        pos(a.issue) - pos(b.issue),
    )
    .map((x, i) => ({ ...x, marker: String(i + 1) }));
}

/** Decoys get letters (A, B, ...) so they never read as issue numbers. */
export function decoyMarker(index: number): string {
  return String.fromCharCode(65 + index);
}

export type PassagePiece = {
  text: string;
  /** Marker of the planned issue this piece belongs to. */
  issue: string | null;
  /** Marker of the decoy this piece belongs to. */
  decoy: string | null;
  /** The user highlighted this piece. */
  user: boolean;
  /** Show this marker right after the piece (the end of an issue or decoy). */
  markerAfter: string | null;
};

type Mark = { start: number; end: number; kind: "issue" | "decoy" | "user"; marker?: string };

/** Split the passage at every mark boundary so overlapping marks still render. */
export function passagePieces(input: {
  passage: string;
  issues: { issue: EmbeddedIssue; marker: string }[];
  validPoints: ValidPoint[];
  highlights: UserHighlight[];
}): PassagePiece[] {
  const { passage } = input;
  const marks: Mark[] = [];
  for (const { issue, marker } of input.issues) {
    const r = findSegmentRange(passage, issue.textSegment);
    if (r) marks.push({ start: r[0], end: r[1], kind: "issue", marker });
  }
  input.validPoints.forEach((vp, i) => {
    const r = findSegmentRange(passage, vp.textSegment);
    if (r) marks.push({ start: r[0], end: r[1], kind: "decoy", marker: decoyMarker(i) });
  });
  for (const h of input.highlights) {
    marks.push({ start: h.startOffset, end: h.endOffset, kind: "user" });
  }

  const cuts = new Set<number>([0, passage.length]);
  for (const m of marks) {
    cuts.add(Math.max(0, Math.min(passage.length, m.start)));
    cuts.add(Math.max(0, Math.min(passage.length, m.end)));
  }
  const points = [...cuts].sort((a, b) => a - b);

  const pieces: PassagePiece[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const end = points[i + 1]!;
    if (end <= start) continue;
    const covering = marks.filter((m) => m.start <= start && m.end >= end);
    const issue = covering.find((m) => m.kind === "issue");
    const decoy = covering.find((m) => m.kind === "decoy");
    const ending = covering.find((m) => m.kind !== "user" && m.end === end);
    pieces.push({
      text: passage.slice(start, end),
      issue: issue?.marker ?? null,
      decoy: decoy?.marker ?? null,
      user: covering.some((m) => m.kind === "user"),
      markerAfter: ending?.marker ?? null,
    });
  }
  return pieces;
}

/**
 * One line comparing how sure the user felt with how much they found. Null when there
 * is nothing to compare (no confidence, or a passage with no planned issues).
 */
export function calibrationLine(
  confidenceBefore: number | null | undefined,
  result: AnalyticalResult,
): string | null {
  if (confidenceBefore == null || result.total === 0) return null;
  const foundPct = Math.round((result.found / result.total) * 100);
  const base = `You felt ${confidenceBefore}% sure and found ${foundPct}% of the issues.`;
  const gap = confidenceBefore - foundPct;
  if (gap >= 25) return `${base} You were more sure than your result - slow down and check each sentence.`;
  if (gap <= -25) return `${base} You did better than you expected - trust your reading more.`;
  return `${base} Your confidence matched your result.`;
}
