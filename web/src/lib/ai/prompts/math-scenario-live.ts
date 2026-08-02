import type { Topic } from "@/lib/types/math-scenario";
import { SCENARIO_DRAFT_SHAPE_PART1, SCENARIO_DRAFT_SHAPE_PART2 } from "@/lib/ai/prompts/scenario-draft-shape";

/**
 * Drafts ONE full Scenario, live, for a topic+title the user already picked from a
 * suggestion list. Lighter than scenario-authoring.ts's buildScenarioAuthoringPrompt
 * (which does open-ended topic selection + anti-clone framing across the whole catalog) -
 * this is scoped to producing exactly one scenario for an already-chosen premise.
 *
 * Served immediately to the requesting user, labeled "AI draft - unverified" in the UI,
 * and excluded from calibration scoring - it has NOT passed the human-verified Monte
 * Carlo check the canonical drafts/promoted pipeline requires (see
 * scripts/promote-scenario.ts). The route additionally re-runs auditScenarioDraft on the
 * result as a deterministic pre-filter before serving it.
 */
export function buildLiveScenarioDraftPrompt(params: { topic: Topic; title: string }): string {
  return `SYSTEM PROMPT - LIVE SCENARIO DRAFT (SINGLE SCENARIO, ALREADY-CHOSEN PREMISE)

You are drafting ONE applied-reasoning scenario for an unverified, on-the-fly practice
session. The user already picked this exact topic and title from a list of suggestions -
your job is to build the full scenario around it, not to choose a different premise.

Topic area: "${params.topic}"
Title: "${params.title}"

CRITICAL RULES (violating any of these produces a broken scenario):

1. NEUTRAL OPTION LABELS: if the commit step is multiple_choice, option labels must state
   bare choices only (e.g. "Accept the contract" / "Decline the contract") - never include
   the computed answer, words like "optimal"/"correct", or the reasoning frame. A label MAY
   include a dollar figure or percentage only when it describes the action itself, never a
   hint about the result.

2. ANSWER MUST BE DERIVED, NOT ASSERTED: "explanation" must show the actual arithmetic
   (numbers, an operator, an "=") that produces "canonicalAnswer" and the commitSpec's
   correct target, step by step.

3. SELF-CONTAINED: "situation" must contain every number needed to reach the answer through
   the user's own reasoning, with any assumption stated explicitly.

4. commitSpec CORRECTNESS GATE: correctOptionId (or targetValue/tolerance or
   acceptableRange for numeric) must resolve to the SAME choice as canonicalAnswer.

5. Output STRICT JSON matching this shape and nothing else (no markdown fences, no prose
   outside the JSON). Do not include "id" - it is assigned by the server.
{
  "topic": "${params.topic}",
  "title": "${params.title}",
${SCENARIO_DRAFT_SHAPE_PART1}
  "toolName": "Name of the reasoning move/tool this scenario teaches",
${SCENARIO_DRAFT_SHAPE_PART2}
}`;
}
