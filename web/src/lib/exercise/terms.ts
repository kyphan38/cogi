import type { Exercise } from "@/lib/types/exercise";

export interface LearnedTerm {
  /** Lowercase, trimmed name: the merge key and the review key. */
  key: string;
  term: string;
  plain: string;
  example: string;
  /** Exercises the term came up in, newest first. */
  seenIn: { id: string; title: string; type: Exercise["type"] }[];
  /** When the oldest exercise with this term was made (ISO time). */
  firstSeen: string;
}

/**
 * "My terms" (PLAN-learning.md): every term from "Learn first", merged by name
 * (case-insensitive), newest definition kept. Built from exercise rows, so no extra
 * collection is needed.
 */
export function collectTerms(rows: Exercise[]): LearnedTerm[] {
  const byKey = new Map<string, LearnedTerm>();
  const newestFirst = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const row of newestFirst) {
    const concepts = "concepts" in row && Array.isArray(row.concepts) ? row.concepts : [];
    for (const c of concepts) {
      const key = c.term.trim().toLowerCase();
      if (!key) continue;
      const seen = { id: row.id, title: row.title, type: row.type };
      const prev = byKey.get(key);
      if (prev) {
        prev.seenIn.push(seen);
        prev.firstSeen = row.createdAt;
      } else {
        byKey.set(key, { key, term: c.term.trim(), plain: c.plain, example: c.example, seenIn: [seen], firstSeen: row.createdAt });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.term.localeCompare(b.term));
}
