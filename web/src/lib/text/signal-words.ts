/**
 * Extreme words that often mark a weak claim. In generated Analytical passages they
 * must not give the answer away: if most problems use them and the sound statements
 * do not, the user can hunt for words instead of reading the reasoning.
 */
export const SIGNAL_WORDS = [
  "always",
  "never",
  "all",
  "every",
  "everyone",
  "everybody",
  "everything",
  "nobody",
  "no one",
  "none",
  "only",
  "prove",
  "proves",
  "proven",
  "proof",
  "guarantee",
  "guaranteed",
  "definitely",
  "certainly",
  "clearly",
  "obviously",
  "completely",
  "totally",
  "must",
] as const;

const SIGNAL_RE = new RegExp(`\\b(${SIGNAL_WORDS.join("|")})\\b`, "i");

export function hasSignalWord(text: string): boolean {
  return SIGNAL_RE.test(text);
}
