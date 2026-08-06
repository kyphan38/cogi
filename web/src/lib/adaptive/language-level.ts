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

/**
 * Prose guidance injected into generation prompts. "Native" = no adjustment at all
 * (must return "" so the appendix contributes zero bytes to the prompt).
 */
export function languageLevelGuidance(level: LanguageLevel): string {
  switch (level) {
    case "Foundation":
      return "Language level: Foundation. Use very short, simple sentences (one idea each). Use only high-frequency everyday vocabulary; avoid idioms, phrasal verbs, and rare or academic words. If a technical or domain term is unavoidable, briefly clarify it inline. Do not simplify the reasoning task itself, its required counts, or its JSON shape - only the surface English.";
    case "Developing":
      return "Language level: Developing. Use short-to-medium sentences with simple clause structure (avoid stacking multiple subordinate clauses). Prefer common, everyday vocabulary over rare or academic words; use idioms and phrasal verbs sparingly and only very common ones. Do not simplify the reasoning task itself, its required counts, or its JSON shape - only the surface English.";
    case "Intermediate":
      return "Language level: Intermediate. Use moderate sentence length and everyday abstract vocabulary; occasional common idioms are fine. Avoid dense academic phrasing, heavy nominalizations, and rare/low-frequency vocabulary. Do not simplify the reasoning task itself, its required counts, or its JSON shape - only the surface English.";
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
