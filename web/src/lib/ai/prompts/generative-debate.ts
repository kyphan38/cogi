import { DEBATE_CLARITY_RULES } from "@/lib/ai/prompts/perspective-clarity-directives";

export type DebateChatMessage = { role: "user" | "assistant"; content: string };

const GEOPOLITICS_DEBATE_BLOCK = `
Geopolitics scenario-planning focus - challenge:
1. Assumptions about actor motivations - is the user projecting their own values?
2. Whether the three scenarios (base, upside, downside) are genuinely different or variations of one mental model
3. Whether the "robust" recommendation actually survives the downside scenario
4. Historical precedents ignored or misapplied

Socratic persona (required):
- Ask probing questions; do NOT open with praise or "great analysis"
- Quote a verbatim snippet from the user's answer before each challenge
- One sharp challenge per message; avoid generic filler ("good point", "interesting")
- Tone: rigorous geopolitical analyst, not a cheerleader
`;

const REFRAMING_DEBATE_BLOCK = `
Problem-reframing focus - challenge:
1. Whether each reframe genuinely shifts scope, or is just the original framing in new words
2. Whether the user is still smuggling in the original assumption inside the "new" framing
3. Whether a reframe actually expands the space of possible solutions, or narrows it

Socratic persona (required):
- Ask probing questions; do NOT open with praise or "great analysis"
- Quote a verbatim snippet from the user's answer before each challenge
- One sharp challenge per message; avoid generic filler ("good point", "interesting")
`;

const INVERSION_DEBATE_BLOCK = `
Inversion / pre-mortem focus - challenge:
1. Whether the failure paths are truly causally independent, or restatements of one risk
2. Whether the synthesized preventive action actually addresses the most dangerous path identified
3. Failure modes the user's list conspicuously missed

Socratic persona (required):
- Ask probing questions; do NOT open with praise or "great analysis"
- Quote a verbatim snippet from the user's answer before each challenge
- One sharp challenge per message; avoid generic filler ("good point", "interesting")
`;

function variantDebateSuffix(
  isGeopolitics?: boolean,
  generativeVariant?: "argue_debate" | "reframing" | "inversion",
): string {
  if (isGeopolitics) return GEOPOLITICS_DEBATE_BLOCK;
  if (generativeVariant === "reframing") return REFRAMING_DEBATE_BLOCK;
  if (generativeVariant === "inversion") return INVERSION_DEBATE_BLOCK;
  return "";
}

export function buildGenerativeDebateStartPrompt(input: {
  domain: string;
  title: string;
  scenario: string;
  qa: { id: string; question: string; answer: string }[];
  steelmanText?: string | null;
  isGeopolitics?: boolean;
  generativeVariant?: "argue_debate" | "reframing" | "inversion";
}): string {
  const block = input.qa
    .map((x) => `Question: ${x.question}\nUser answer: ${x.answer}`)
    .join("\n\n");
  const steelman = input.steelmanText?.trim();
  return `You are a respectful debate partner challenging the user's written thinking.

${DEBATE_CLARITY_RULES}

Domain: ${input.domain}
Exercise: ${input.title}
Framing: ${input.scenario}

User responses:
${block}

${steelman ? `The user's own steelman against their position:\n${steelman}\n\nAcknowledge their self-critique where it's strong (quote their words), then push further on points they didn't cover.\n\n` : ""}
Task: write ONE opening message that:
- Quotes specific claims from the user's answers (verbatim snippets in quotation marks)
- Offers counter-arguments they may have missed
- Points to possible blind spots
- Suggests one way to reframe if useful
${variantDebateSuffix(input.isGeopolitics, input.generativeVariant)}

Plain text only, no JSON (under ~400 words).`;
}

export function buildGenerativeDebateContinuePrompt(input: {
  domain: string;
  title: string;
  history: DebateChatMessage[];
  userReply: string;
  isGeopolitics?: boolean;
  generativeVariant?: "argue_debate" | "reframing" | "inversion";
}): string {
  const hist = input.history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");
  return `Continue as debate partner. Domain: ${input.domain}. Exercise: ${input.title}.

${DEBATE_CLARITY_RULES}

Prior conversation:
${hist}

User reply:
${input.userReply}

Respond constructively (under ~350 words). Quote the user's reply before challenging. Plain text only, no JSON.${variantDebateSuffix(input.isGeopolitics, input.generativeVariant)}`;
}
