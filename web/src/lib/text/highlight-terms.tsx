import type { ReactNode } from "react";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wraps exact (case-insensitive) occurrences of `terms` in `text` with a highlight mark.
 * Nothing else is highlighted. Longer terms are matched first so overlapping substrings
 * (e.g. "Cost" vs "Cost Efficiency") resolve to the longer match.
 */
export function highlightTerms(text: string, terms: string[]): ReactNode[] {
  const cleaned = Array.from(new Set(terms.map((t) => t.trim()).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );
  if (cleaned.length === 0) return [text];

  const pattern = new RegExp(`(${cleaned.map(escapeRegExp).join("|")})`, "gi");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-foreground font-semibold">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
