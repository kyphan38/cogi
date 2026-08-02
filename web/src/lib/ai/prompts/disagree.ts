import { NO_INDEX_REFERENCE_RULE } from "@/lib/ai/prompts/perspective-clarity-directives";
import type { PerspectiveKind, PerspectiveSectionKey } from "@/lib/types/disagreement";

export function buildPerspectiveDisagreePrompt(input: {
  kind: PerspectiveKind;
  exerciseTitle: string;
  domain?: string;
  section: PerspectiveSectionKey;
  pointTitle?: string | null;
  pointBody: string;
  userReason: string;
  priorTurns?: { userReason: string; aiReply: string }[];
}): string {
  const title = input.pointTitle?.trim() || "(untitled point)";
  const domainLine = input.domain?.trim() ? `Domain: ${input.domain}\n` : "";
  const priorTurns = input.priorTurns ?? [];
  const conversationBlock =
    priorTurns.length > 0
      ? `\nConversation so far (oldest first - stay consistent with what you already said, build on it rather than repeating yourself):
---
${priorTurns
  .map((t, i) => `Round ${i + 1}\nUser: ${t.userReason}\nYou: ${t.aiReply}`)
  .join("\n\n")}
---
`
      : "";
  return `You are a collaborative peer (not a judge). The user is practicing thinking skills.

Exercise kind: ${input.kind}
${domainLine}Exercise title: ${input.exerciseTitle}

They opened a discussion on this perspective point (section: ${input.section}):
Title: ${title}
Point:
---
${input.pointBody}
---
${conversationBlock}
User's latest message:
---
${input.userReason}
---

${NO_INDEX_REFERENCE_RULE}

Instructions:
- Respond in plain text (no JSON), 120–220 words.
- Quote or mirror the user's stated reason before responding.
- Genuinely engage: you may concede partially, or push back with reasoning - avoid dismissiveness.
- Do not invent facts about the user; stay grounded in the text above.
- Do not give a numeric score.`;
}
