import type { LearnedTerm } from "@/lib/exercise/terms";
import { seededHash, shuffledOrder } from "@/lib/exercise/guided-candidates";
import {
  initialState,
  localDay,
  reviewStatus,
  type ReviewItemState,
  type ReviewStatus,
} from "@/lib/review/schedule";

/** Terms in one review (about a minute or two). */
export const TERM_REVIEW_LENGTH = 5;
/** Fewest terms for a 4-way choice; below it the user recalls and grades themselves. */
export const TERM_CHOICE_COUNT = 4;

/** Saved review state per term key. Terms with no entry were never reviewed. */
export type TermReviewStates = Partial<Record<string, ReviewItemState>>;

/** A term's state: saved, or first due one day after it was first met. */
export function termState(term: LearnedTerm, states: TermReviewStates): ReviewItemState {
  return states[term.key] ?? initialState(localDay(new Date(term.firstSeen)));
}

export function termStatus(term: LearnedTerm, states: TermReviewStates, today: string): ReviewStatus {
  return reviewStatus(termState(term, states), today);
}

/** Due terms, the longest overdue first, at most TERM_REVIEW_LENGTH. */
export function pickTermReview(terms: LearnedTerm[], states: TermReviewStates, today: string): LearnedTerm[] {
  return dueTerms(terms, states, today).slice(0, TERM_REVIEW_LENGTH);
}

export function dueTerms(terms: LearnedTerm[], states: TermReviewStates, today: string): LearnedTerm[] {
  return terms
    .map((t) => ({ t, s: termState(t, states) }))
    .filter(({ s }) => s.due != null && s.due <= today)
    .sort((a, b) => a.s.due!.localeCompare(b.s.due!) || a.t.key.localeCompare(b.t.key))
    .map(({ t }) => t);
}

/**
 * Four terms to choose from (the target and 3 of the user's other terms), in an order
 * set by `seed`; null when the user has fewer than 4 terms.
 */
export function termChoices(target: LearnedTerm, all: LearnedTerm[], seed: string): LearnedTerm[] | null {
  const others = all
    .filter((t) => t.key !== target.key)
    .sort((a, b) => seededHash(`${seed}-${a.key}`) - seededHash(`${seed}-${b.key}`))
    .slice(0, TERM_CHOICE_COUNT - 1);
  if (others.length < TERM_CHOICE_COUNT - 1) return null;
  const four = [target, ...others];
  return shuffledOrder(four.length, `${seed}-${target.key}`).map((i) => four[i]!);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The text with the term blanked out (any case), so the clue does not give it away. */
export function blankTerm(text: string, term: string): string {
  const t = term.trim();
  if (!t) return text;
  return text.replace(new RegExp(escapeRegExp(t), "gi"), "____");
}
