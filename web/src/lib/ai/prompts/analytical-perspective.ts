import { buildPerspectiveClarityPreamble } from "@/lib/ai/prompts/perspective-clarity-directives";
import type { EmbeddedIssue } from "@/lib/types/exercise";
import type { UserHighlight } from "@/lib/types/exercise";

export function buildAnalyticalPerspectivePrompt(input: {
  title: string;
  passage: string;
  embeddedIssues: EmbeddedIssue[];
  validPoints: { textSegment: string; explanation: string }[];
  userHighlights: UserHighlight[];
  confidenceBefore: number;
  domain: string;
  userContext?: string;
  hiddenPerspective?: string;
  missingActors?: string[];
  userPerspectiveGuess?: string;
  userMissingActorsGuess?: string[];
  metaGuessScore?: number;
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  const geoBlock =
    input.hiddenPerspective?.trim()
      ? `

Geopolitics meta-analysis (ground truth - user has now attempted identification):
- Hidden perspective: ${input.hiddenPerspective}
- Missing actors/perspectives absent from passage: ${JSON.stringify(input.missingActors ?? [])}
- User's perspective guess: ${input.userPerspectiveGuess?.trim() || "(none)"}
- User's missing-actor guesses: ${JSON.stringify(input.userMissingActorsGuess ?? [])}
- Light meta-guess score (0-100): ${input.metaGuessScore ?? "n/a"}

In your debrief, explicitly discuss framing bias, missing stakeholders, and whether the user identified the unstated viewpoint. Reference their meta guesses with quoted snippets, not harsh judgment.`
      : "";

  const clarity = buildPerspectiveClarityPreamble();

  return `You are a thoughtful peer helping someone practice analytical reading in the domain: ${input.domain}.
User context (may be empty): ${ctx}

${clarity}

Exercise title: ${input.title}
Passage:
---
${input.passage}
---

What the model author intentionally embedded (ground truth issues):
${JSON.stringify(input.embeddedIssues, null, 2)}

Decoy valid points (look suspicious but are actually fine):
${JSON.stringify(input.validPoints, null, 2)}

User's highlights (offsets are character indices into the passage above):
${JSON.stringify(input.userHighlights, null, 2)}

User self-reported confidence before seeing your notes: ${input.confidenceBefore}%
${geoBlock}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "clarity_v2",
  "title": string (echo exercise title above),
  "suitableFor": "Suitable for <concrete audience derived from domain and scenario>",
  "highlightCritiques": [
    {
      "id": "hc_1",
      "userTextSnippet": "exact quoted substring from passage the user highlighted or a key phrase they focused on",
      "critique": "You highlighted '[snippet]'... However, ...",
      "remediationAlternative": "An analyst looking for high-fidelity alternatives would have noted..."
    }
  ],
  "openQuestions": ["optional 1-3 strings about what remains uncertain"]
}

Rules:
- Produce one highlightCritiques row per meaningful user highlight OR embedded issue comparison (at least 3, at most 8).
- Include at least one row whose critique engages a debatable highlight: start critique with "Your highlight of '...' is interesting - here's why that's debatable:"
- For highlights with no matching embedded issue, still quote their selected text in userTextSnippet.
- Tone: collaborative peer, not a judge. Do not give a numeric score for the exercise.`;
}
