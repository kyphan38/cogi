/**
 * JSON output-shape fragments shared by scenario-authoring.ts (offline CLI draft author) and
 * math-scenario-live.ts (live on-the-fly generation) - both validate against
 * src/lib/scenarios/scenario-schema.ts. The two files' surrounding "CRITICAL RULES" prose
 * genuinely differs in wording (authoring has extra anti-clone framing) and is intentionally
 * NOT merged here - only the byte-identical JSON shape lines are shared.
 */

/** situation / commitSpec / keyTraps / hintLadder / canonicalAnswer / explanation. No trailing comma - callers append their own "toolName" line next. */
export const SCENARIO_DRAFT_SHAPE_PART1 = `  "situation": "Full scenario text with every needed number...",
  "commitSpec": {
    "kind": "multiple_choice",
    "promptText": "Select the rational decision.",
    "correctOptionId": "opt_a",
    "options": [
      { "id": "opt_a", "text": "Bare choice A" },
      { "id": "opt_b", "text": "Bare choice B" }
    ]
  },
  "keyTraps": ["Cognitive trap 1", "Cognitive trap 2"],
  "hintLadder": ["Progressive Socratic hint 1", "Hint 2", "Hint 3"],
  "canonicalAnswer": "The correct choice, stated plainly with the key number.",
  "explanation": "Step-by-step derivation with visible arithmetic ending in canonicalAnswer.",`;

/** transfers / boundaries / fieldNote. No trailing comma - callers append their own suffix (closing brace, or an extra field then closing brace). */
export const SCENARIO_DRAFT_SHAPE_PART2 = `  "transfers": [{ "domain": "Other domain", "mapping": "How the same structure appears there." }],
  "boundaries": [{ "condition": "When this model breaks", "whyItBreaks": "Why." }],
  "fieldNote": "One-line real-life takeaway."`;
