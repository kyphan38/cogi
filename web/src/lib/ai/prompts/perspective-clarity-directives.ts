/**
 * Shared prompt rule: always name what the user wrote, never only an index or id.
 * The old clarity blueprint (forced "stronger alternative", "Suitable for") was
 * replaced by code-scored coaching feedback (plan phases 2 and 6a).
 */

export const NO_INDEX_REFERENCE_RULE = `ABSOLUTE PROHIBITION OF SHORTCUT REFERENCES:
- You are strictly forbidden from referencing user input solely by index, item number, step count, grid position, or bare id.
- Never write phrases like "your answer to question 2", "item 2", "step 3", "p2", "criterion c1", or "node_4" without also quoting or restating the actual text, label, score, or selection the user submitted.
- You are also strictly forbidden from writing the internal id anywhere in your output, even alongside the label - do not write things like "'Speed to Market' (c2)", "Option A (o1)", or "criterion c1 (Alliance Credibility)".
- When mentioning a criterion, option, node, or prompt, refer to it ONLY by its human-readable label or title, always paired with the user's concrete value or quoted text - never the id.`;
