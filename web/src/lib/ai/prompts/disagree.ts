import type { PerspectiveKind, PerspectiveSectionKey } from "@/lib/types/disagreement";

export function buildPerspectiveDisagreePrompt(input: {
  kind: PerspectiveKind;
  exerciseTitle: string;
  domain?: string;
  section: PerspectiveSectionKey;
  pointTitle?: string | null;
  pointBody: string;
  userReason: string;
}): string {
  const title = input.pointTitle?.trim() || "(untitled point)";
  const domainLine = input.domain?.trim() ? `Domain: ${input.domain}\n` : "";
  return `You are a collaborative peer (not a judge). The user is practicing thinking skills.

Exercise kind: ${input.kind}
${domainLine}Exercise title: ${input.exerciseTitle}

They clicked "I disagree" on this perspective point (section: ${input.section}):
Title: ${title}
Point:
---
${input.pointBody}
---

User's reason for disagreeing:
---
${input.userReason}
---

Instructions:
- Respond in plain text (no JSON), 120–220 words.
- Genuinely engage: you may concede partially, or push back with reasoning - avoid dismissiveness.
- Do not invent facts about the user; stay grounded in the text above.
- Do not give a numeric score.`;
}
