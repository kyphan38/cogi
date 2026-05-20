import type { AnalyticalExercise } from "@/lib/ai/validators/common";

function normalizeForMatch(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) {
    if (b.has(w)) inter++;
  }
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

function findNormalizedSubstring(
  passage: string,
  segment: string,
): [number, number] | null {
  const normSeg = normalizeForMatch(segment);
  if (!normSeg) return null;
  const len = segment.length;
  const slack = Math.max(8, Math.floor(len * 0.2));

  for (let start = 0; start < passage.length; start++) {
    const minEnd = start + Math.max(1, len - slack);
    const maxEnd = Math.min(passage.length, start + len + slack);
    for (let end = minEnd; end <= maxEnd; end++) {
      if (normalizeForMatch(passage.slice(start, end)) === normSeg) {
        return [start, end];
      }
    }
  }
  return null;
}

function findByWindowSearch(
  passage: string,
  segment: string,
): [number, number] | null {
  if (segment.length < 20) return null;
  const segTokens = tokenSet(segment);
  if (segTokens.size === 0) return null;

  const words = passage.split(/(\s+)/);
  let bestScore = 0;
  let bestStart = -1;
  let bestEnd = -1;

  for (let i = 0; i < words.length; i++) {
    if (!words[i]!.trim()) continue;
    let chunk = "";
    let startChar = 0;
    for (let j = 0; j < i; j++) startChar += words[j]!.length;

    for (let j = i; j < words.length; j++) {
      chunk += words[j];
      const len = normalizeForMatch(chunk).length;
      if (len > segment.length * 1.4) break;
      if (len < segment.length * 0.5) continue;

      const score = jaccard(segTokens, tokenSet(chunk));
      if (score > bestScore) {
        bestScore = score;
        bestStart = startChar;
        bestEnd = startChar + chunk.length;
      }
    }
  }

  if (bestScore >= 0.85 && bestStart >= 0 && bestEnd > bestStart) {
    return [bestStart, bestEnd];
  }
  return null;
}

export function findSegmentRange(
  passage: string,
  segment: string,
): [number, number] | null {
  if (!segment.trim()) return null;
  const exact = passage.indexOf(segment);
  if (exact !== -1) return [exact, exact + segment.length];

  const normalized = findNormalizedSubstring(passage, segment);
  if (normalized) return normalized;

  return findByWindowSearch(passage, segment);
}

export function repairTextSegment(passage: string, segment: string): string {
  const range = findSegmentRange(passage, segment);
  if (!range) return segment;
  return passage.slice(range[0], range[1]);
}

export function repairAnalyticalSegments(data: AnalyticalExercise): AnalyticalExercise {
  const passage = data.passage;
  return {
    ...data,
    embeddedIssues: data.embeddedIssues.map((issue) => ({
      ...issue,
      textSegment: repairTextSegment(passage, issue.textSegment),
    })),
    validPoints: data.validPoints.map((vp) => ({
      ...vp,
      textSegment: repairTextSegment(passage, vp.textSegment),
    })),
  };
}
