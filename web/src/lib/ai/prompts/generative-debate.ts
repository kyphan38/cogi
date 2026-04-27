export type DebateChatMessage = { role: "user" | "assistant"; content: string };

export function buildGenerativeDebateStartPrompt(input: {
  domain: string;
  title: string;
  scenario: string;
  qa: { id: string; question: string; answer: string }[];
  steelmanText?: string | null;
}): string {
  const block = input.qa
    .map((x) => `${x.id}: ${x.question}\n${x.answer}`)
    .join("\n\n");
  const steelman = input.steelmanText?.trim();
  return `You are a respectful debate partner challenging the user's written thinking.

Domain: ${input.domain}
Exercise: ${input.title}
Framing: ${input.scenario}

User responses:
${block}

${steelman ? `The user's own steelman against their position:\n${steelman}\n\nAcknowledge their self-critique where it's strong, then push further on points they didn't cover.\n\n` : ""}
Task: write ONE opening message that:
- Challenges specific claims constructively
- Offers counter-arguments they may have missed
- Points to possible blind spots
- Suggests one way to reframe if useful

Plain text only, no JSON, concise (under ~400 words).`;
}

export function buildGenerativeDebateContinuePrompt(input: {
  domain: string;
  title: string;
  history: DebateChatMessage[];
  userReply: string;
}): string {
  const hist = input.history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");
  return `Continue as debate partner. Domain: ${input.domain}. Exercise: ${input.title}.

Prior conversation:
${hist}

User reply:
${input.userReply}

Respond constructively (under ~350 words). Plain text only, no JSON.`;
}
