export interface ExistingReasoningMove {
  toolName: string;
  topic: string;
  /** One-line description of the lesson this scenario teaches (its fieldNote). */
  reasoningMove: string;
}

/**
 * Drafts a new canonical Scenario. The draft is NEVER live truth on its own - it lands in
 * src/lib/scenarios/drafts/ (not imported by the app) and can only reach learners via
 * scripts/promote-scenario.ts, which requires a passing Monte Carlo verifier, a passing
 * automated audit (src/lib/scenarios/audit-draft.ts), and an explicit human confirmation.
 */
export function buildScenarioAuthoringPrompt(existingMoves: ExistingReasoningMove[]): string {
  const existingList = existingMoves
    .map((m, i) => `${i + 1}. [${m.topic}] "${m.toolName}" — ${m.reasoningMove}`)
    .join("\n");

  return `SYSTEM PROMPT — SCENARIO DRAFT AUTHOR (UNVERIFIED DRAFT, NOT LIVE CONTENT)

You are drafting ONE new scenario for an applied-reasoning training module. This is a DRAFT
that a human will review, verify with an independent calculation, and only then may promote
to the live catalog. Nothing you produce here is shown to a learner automatically.

[REASONING MOVES ALREADY IN THE LIVE CATALOG — DO NOT REPEAT ANY OF THESE]
${existingList || "(none yet)"}

CRITICAL OPERATIONAL RULES (violating any of these voids the draft):

1. ANTI-CLONE: Your scenario's "toolName" and its underlying reasoning move MUST be
   distinct from every entry listed above. A scenario that is just another
   probability-times-payoff calculation dressed in a new cover story is a clone and will be
   rejected, even if the toolName string is different. In your "notes" field (see JSON shape
   below — this field is stripped before promotion and exists only for the human reviewer),
   explicitly state: (a) which reasoning move this is, and (b) one sentence on how it differs
   structurally from every scenario listed above.

2. NEUTRAL OPTION LABELS: An option label must never contain the insight the user is
   supposed to reach. If someone who does not understand the concept could pick the correct
   option from the labels alone, the draft is void. Labels state bare choices only (e.g.
   "Accept the contract" / "Decline the contract") — never include words like "optimal",
   "correct", the computed answer, or the reasoning frame in a label. A label MAY include a
   dollar figure or percentage ONLY when that number is part of describing the action itself
   (e.g. "Pay $60,000 for a study"), never a hint about the result.

3. ANSWER MUST BE DERIVED, NOT ASSERTED: "explanation" must show the actual arithmetic that
   produces "canonicalAnswer" and the commitSpec's correct target — numbers, an operator, an
   "=", step by step. A one-line assertion with no visible calculation is void.

4. SELF-CONTAINED: "situation" must contain every number the user needs to reach the
   intended answer through their OWN reasoning, with any assumption stated explicitly. The
   one narrow exception: if the scenario's lesson is specifically about a hidden/comparative
   base rate the user should not have (an "inside view vs. reference class" trap), it is
   acceptable to withhold only that specific correcting number from "situation" and reveal it
   in "explanation" — but say so explicitly in "notes" if you do this.

5. commitSpec CORRECTNESS GATE: correctOptionId (or targetValue/tolerance or
   acceptableRange for numeric) must resolve to the SAME choice as canonicalAnswer. Do not
   let these drift apart.

6. Output STRICT JSON matching exactly the Scenario shape below, valid against
   src/lib/scenarios/scenario-schema.ts, and nothing else (no markdown fences, no prose
   outside the JSON):
{
  "id": "kebab-case-unique-id",
  "topic": "expected_value",
  "title": "Short title",
  "situation": "Full scenario text with every needed number...",
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
  "explanation": "Step-by-step derivation with visible arithmetic ending in canonicalAnswer.",
  "toolName": "Name of the distinct reasoning move/tool",
  "transfers": [{ "domain": "Other domain", "mapping": "How the same structure appears there." }],
  "boundaries": [{ "condition": "When this model breaks", "whyItBreaks": "Why." }],
  "fieldNote": "One-line real-life takeaway.",
  "notes": "Reviewer-only: state the reasoning move and how it differs from the list above; flag any withheld base-rate number per rule 4."
}`;
}
