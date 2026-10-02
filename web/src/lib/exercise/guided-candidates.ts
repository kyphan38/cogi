import type { EmbeddedIssue, ValidPoint } from "@/lib/types/exercise";
import { findSegmentRange } from "@/lib/text/segment-match";
import { sentenceRangeAt, splitSentences, type TextRange } from "@/lib/text/sentences";

/** Extra plain sentences mixed in, so the suggested list does not give the answer away. */
const PLAIN_EXTRAS = 2;

/** Small stable hash, so the same exercise always gets the same picks and order. */
export function seededHash(seed: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Sentences the guided walkthrough asks about, in passage order: every sentence that
 * holds a planned issue or a trap, plus a couple of ordinary ones picked by `seed`.
 */
export function guidedCandidates(input: {
  passage: string;
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  seed: string;
}): TextRange[] {
  const { passage } = input;
  const picked = new Map<number, TextRange>();
  for (const seg of [...input.embeddedIssues, ...input.validPoints].map((x) => x.textSegment)) {
    const r = findSegmentRange(passage, seg);
    if (!r) continue;
    const s = sentenceRangeAt(passage, r[0]);
    picked.set(s.start, s);
  }
  const others = splitSentences(passage)
    .filter((s) => !picked.has(s.start))
    .map((s, i) => ({ s, key: seededHash(input.seed, i) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, PLAIN_EXTRAS);
  for (const { s } of others) picked.set(s.start, s);
  return [...picked.values()].sort((a, b) => a.start - b.start);
}

/** Option order for the main-claim quiz, shuffled by `seed` so the answer is not always first. */
export function shuffledOrder(count: number, seed: string): number[] {
  return Array.from({ length: count }, (_, i) => i)
    .map((i) => ({ i, key: seededHash(seed, 100 + i) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.i);
}
