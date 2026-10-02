export type TextRange = { start: number; end: number };

const CLOSERS = `"'”’)]`;

/**
 * True when the text just before position `i` ends a sentence: ".", "!" or "?" (maybe
 * with a closing quote), followed by the end of the text, a line break, or a space and
 * then something that can start a sentence. So "3.5" and "5 a.m. to win" do not split.
 */
function endsSentenceAt(passage: string, i: number): boolean {
  let j = i;
  while (j > 0 && CLOSERS.includes(passage[j - 1]!)) j--;
  if (j === 0 || !/[.!?]/.test(passage[j - 1]!)) return false;
  if (i >= passage.length) return true;
  if (!/\s/.test(passage[i]!)) return false;
  let k = i;
  while (k < passage.length && /[ \t]/.test(passage[k]!)) k++;
  if (k >= passage.length || passage[k] === "\n" || passage[k] === "\r") return true;
  return !/[a-z]/.test(passage[k]!);
}

/**
 * The sentence around `index`: from just after the previous sentence end (or line
 * break) to the next one, without surrounding whitespace.
 */
export function sentenceRangeAt(passage: string, index: number): TextRange {
  let start = index;
  while (start > 0) {
    const prev = passage[start - 1]!;
    if (prev === "\n" || (/\s/.test(prev) && endsSentenceAt(passage, start - 1))) break;
    start--;
  }
  let end = index;
  while (end < passage.length && passage[end] !== "\n") {
    end++;
    if (endsSentenceAt(passage, end)) break;
  }
  while (start < end && /\s/.test(passage[start]!)) start++;
  while (end > start && /\s/.test(passage[end - 1]!)) end--;
  return { start, end };
}

/** Every sentence in the passage, in order, without the whitespace between them. */
export function splitSentences(passage: string): TextRange[] {
  const out: TextRange[] = [];
  let i = 0;
  while (i < passage.length) {
    if (/\s/.test(passage[i]!)) {
      i++;
      continue;
    }
    const r = sentenceRangeAt(passage, i);
    if (r.end <= i) {
      i++;
      continue;
    }
    out.push(r);
    i = r.end;
  }
  return out;
}
