import type { LearnedTerm } from "@/lib/exercise/terms";

/** Exercise titles listed on the back of a card, at most. */
const SEEN_IN_MAX = 3;

/** One line, no line breaks or runs of spaces: a blank line would end the card. */
function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The example with the first use of the term in bold (any case), as /anki-import reads it. */
export function boldTerm(example: string, term: string): string {
  const t = oneLine(term);
  if (!t) return example;
  return example.replace(new RegExp(escapeRegExp(t), "i"), (m) => `**${m}**`);
}

/**
 * "My terms" as a cards file for the /anki-import skill (PLAN-retention.md R3).
 * One card per term, cards split by a blank line:
 *   1. <term>                  header, not on the card
 *   <example, term in bold>    front, and the key for duplicates
 *   [Concept] <meaning>        back
 *   Seen in: <titles>          back, after the line
 */
export function termsToAnkiText(terms: LearnedTerm[]): string {
  return terms
    .map((t, i) => {
      const term = oneLine(t.term);
      const example = oneLine(t.example) || term;
      const lines = [`${i + 1}. ${term}`, boldTerm(example, term), `[Concept] ${oneLine(t.plain) || term}`];
      const titles = t.seenIn.slice(0, SEEN_IN_MAX).map((s) => oneLine(s.title)).filter(Boolean);
      if (titles.length > 0) lines.push(`Seen in: ${titles.join(", ")}`);
      return lines.join("\n");
    })
    .join("\n\n")
    .concat("\n");
}

/** File name with the local date, e.g. cogi-terms-2026-11-15.txt. */
export function ankiFileName(day: string): string {
  return `cogi-terms-${day}.txt`;
}
