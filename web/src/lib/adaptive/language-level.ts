/**
 * Manual "Language Level" bar (Settings). Independent axis from difficulty tier:
 * this controls English complexity (sentence length, vocabulary, idiom density)
 * without changing reasoning difficulty, required counts, or JSON shapes.
 */
export type LanguageLevel = "Foundation" | "Developing" | "Intermediate" | "Advanced" | "Native";

export const LANGUAGE_LEVELS: readonly LanguageLevel[] = [
  "Foundation",
  "Developing",
  "Intermediate",
  "Advanced",
  "Native",
] as const;

export const LANGUAGE_LEVEL_DESCRIPTIONS: Record<LanguageLevel, string> = {
  Foundation: "~IELTS 4.0-4.5",
  Developing: "~IELTS 5.0-5.5",
  Intermediate: "~IELTS 6.0-6.5",
  Advanced: "~IELTS 7.0-7.5",
  Native: "Unmodified",
};

/** Matches the user's current real-world level (Vietnamese, IELTS ~6.0-6.5). */
export const DEFAULT_LANGUAGE_LEVEL: LanguageLevel = "Intermediate";

export function isLanguageLevel(value: unknown): value is LanguageLevel {
  return typeof value === "string" && (LANGUAGE_LEVELS as readonly string[]).includes(value);
}

/** Same task, simpler English: added to every level below Advanced. */
const KEEP_TASK = "This applies to every text the learner reads: scenario, passage, options, explanations and feedback. Do not simplify the reasoning task itself, its required counts, or its JSON shape - only the surface English.";

/**
 * Prose guidance injected into generation prompts. "Native" = no adjustment at all
 * (must return "" so the appendix contributes zero bytes to the prompt).
 * Below Advanced it gives numbers and examples: a vague "moderate sentence length"
 * still produced 40-word sentences and words like "discrepancy" at Intermediate.
 */
export function languageLevelGuidance(level: LanguageLevel): string {
  switch (level) {
    case "Foundation":
      return `Language level: Foundation (about IELTS 4-4.5). Keep every sentence under 12 words, one idea each. Use only very common everyday words. No idioms, no phrasal verbs, no rare or academic words. If a technical or domain term is unavoidable, explain it in a few plain words in brackets the first time. ${KEEP_TASK}`;
    case "Developing":
      return `Language level: Developing (about IELTS 5-5.5). Keep every sentence under 16 words, one main idea each, with at most one "because", "which" or "while" clause. Use common everyday words. No idioms; only very common phrasal verbs. If a less common word or domain term is needed, explain it in a few plain words in brackets the first time. ${KEEP_TASK}`;
    case "Intermediate":
      return `Language level: Intermediate (about IELTS 6-6.5, CEFR B2). Keep most sentences under 20 words and never over 25; split a long sentence into two. One main idea per sentence. Use common everyday words: "mistake", not "discrepancy"; "risky", not "speculative"; "keep", not "preserve". If a less common word or domain term is needed, explain it in a few plain words in brackets the first time. No idioms or figures of speech (not "windfall", "razor-thin margins", "a slap in the face"). Prefer plain verbs to heavy nouns: "decide", not "make a decision about". ${KEEP_TASK}`;
    case "Advanced":
      return "Language level: Advanced. Richer vocabulary and more complex sentence structures are fine, but still favor clarity over ornamentation - avoid needlessly obscure words when a clear one works just as well.";
    case "Native":
      return "";
  }
}

/**
 * Appended to generation prompts on the server, as its own delimited block separate
 * from the difficulty-tier appendix (they are orthogonal axes: reasoning difficulty
 * vs. surface English complexity). Returns undefined for "Native" / unset so the
 * default behavior is byte-identical to prompts built before this feature existed.
 */
export function buildLanguageLevelAppendix(level: LanguageLevel | undefined | null): string | undefined {
  if (!level || level === "Native") return undefined;
  const guidance = languageLevelGuidance(level);
  if (!guidance.trim()) return undefined;
  return [
    "--- Language level guidance (do not violate any required counts, enums, or JSON shapes above) ---",
    guidance,
  ].join("\n");
}

/** Read `languageLevel` off a parsed request body, falling back to the default. */
export function resolveLanguageLevel(body: Record<string, unknown>): LanguageLevel {
  return isLanguageLevel(body.languageLevel) ? body.languageLevel : DEFAULT_LANGUAGE_LEVEL;
}
