/** Shared steering for post-submit evaluation and generative debate prompts. */

export const SUITABLE_FOR_RULE = `MANDATORY suitableFor field:
- Include top-level "suitableFor" immediately after "title".
- Value MUST start with exactly "Suitable for " followed by a concrete audience or professional role (e.g. "Suitable for intelligence analysts tracking maritime choke points").
- Derive it from domain, user context, and scenario-never use generic filler like "Suitable for learners" or "Suitable for anyone".`;

export const NO_INDEX_REFERENCE_RULE = `ABSOLUTE PROHIBITION OF SHORTCUT REFERENCES:
- You are strictly forbidden from referencing user input solely by index, item number, step count, grid position, or bare id.
- Never write phrases like "your answer to question 2", "item 2", "step 3", "p2", "criterion c1", or "node_4" without also quoting or restating the actual text, label, score, or selection the user submitted.
- You are also strictly forbidden from writing the internal id anywhere in your output, even alongside the label - do not write things like "'Speed to Market' (c2)", "Option A (o1)", or "criterion c1 (Alliance Credibility)".
- When mentioning a criterion, option, node, or prompt, refer to it ONLY by its human-readable label or title, always paired with the user's concrete value or quoted text - never the id.`;

export const CLARITY_BLUEPRINT_RULE = `MANDATORY CLARITY BLUEPRINT (every critique or evaluation string):
1. WHAT the user wrote or selected - quote or mirror a relevant snippet verbatim (use quotation marks for excerpts).
2. WHAT the underlying layout issue, blind spot, or structural weakness is.
3. WHAT a stronger analytical alternative interpretation or framing looks like.
Each critique must be self-contained: a reader who never saw the exercise must understand which user input you mean.`;

export function buildPerspectiveClarityPreamble(): string {
  return `
GLOBAL EVALUATION RULES (apply to every field you write):
${SUITABLE_FOR_RULE}

${NO_INDEX_REFERENCE_RULE}

${CLARITY_BLUEPRINT_RULE}
`.trim();
}

export const DEBATE_CLARITY_RULES = `
${NO_INDEX_REFERENCE_RULE}

For each challenge: open by quoting a verbatim snippet from the user's written answer (in quotation marks), then push back. Plain text only.
Never reference a prompt as "p1" or "question 2" without the quoted snippet in the same sentence.
`.trim();
