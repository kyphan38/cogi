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

function geopoliticsDebateSuffix(isGeopolitics?: boolean): string {
  return isGeopolitics ? GEOPOLITICS_DEBATE_BLOCK : "";
}

export function buildGenerativeDebateStartPrompt(input: {
  domain: string;
  title: string;
  scenario: string;
  qa: { id: string; question: string; answer: string }[];
  steelmanText?: string | null;
  isGeopolitics?: boolean;
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
${geopoliticsDebateSuffix(input.isGeopolitics)}

Plain text only, no JSON (under ~400 words).`;
}

export function buildGenerativeDebateContinuePrompt(input: {
  domain: string;
  title: string;
  history: DebateChatMessage[];
  userReply: string;
  isGeopolitics?: boolean;
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

Respond constructively (under ~350 words). Quote the user's reply before challenging. Plain text only, no JSON.${geopoliticsDebateSuffix(input.isGeopolitics)}`;
}
