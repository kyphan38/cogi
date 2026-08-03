/**
 * Shared across recommend-mode.ts and topic-suggestions.ts - one description per exercise mode.
 *
 * Deliberately excludes "combo": those two consumers assume every key is a single recommendable
 * mode, but combo requires picking a preset first (which sub-modes, in what order) rather than
 * just a topic - it doesn't fit the single-mode recommendation UX. Combo is already discoverable
 * on its own via `ALL_EXERCISE_CARDS` in the exercise picker, where it's deliberately excluded
 * from AI-ranked ordering and always appended last (see reasoning/page.tsx's `orderedCards`).
 */
export const EXERCISE_MODE_DESCRIPTIONS: Record<string, string> = {
  analytical: "spotting flawed reasoning, logical fallacies, and hidden assumptions in arguments",
  sequential: "ordering steps in a process, understanding dependencies and sequences",
  systems: "mapping feedback loops, cause-and-effect networks, and system dynamics",
  evaluative: "comparing options with weighted criteria, tradeoff analysis, and decision matrices",
  generative: "writing arguments or proposals, then stress-testing them via debate",
};
