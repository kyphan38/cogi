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
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  return `You are a thoughtful peer helping someone practice analytical reading in the domain: ${input.domain}.
User context (may be empty): ${ctx}

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

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "embedded": [ { "id": string, "title"?: string, "body": string }, ... ],
  "userFound": [ { "id": string, "title"?: string, "body": string }, ... ],
  "additional": [ { "id": string, "title"?: string, "body": string }, ... ],
  "openQuestions": [ { "id": string, "title"?: string, "body": string }, ... ]
}

Section meanings (map to those keys exactly):
- embedded: ground truth recap tied to embeddedIssues (3–6 points).
- userFound: highlights that do not align with planned embedded issues - evaluate generously (0+ points).
- additional: non-judgmental angles they may have missed (2–5 points).
- openQuestions: what remains uncertain (1–4 points).

Also include ONE debatable-highlight paragraph inside embedded OR userFound as a point whose body starts with:
"Your highlight of ... is interesting - here's why that's debatable:"

Tone: collaborative peer, not a judge. Do not give a numeric score for the exercise. Keep each body concise (most bodies under ~220 chars).`;
}
