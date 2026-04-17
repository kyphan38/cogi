export function buildJournalReferencePrompt(input: {
  domain: string;
  snippets: string[];
}): string {
  const joined = input.snippets
    .map((s, i) => `(${i + 1}) ${s.slice(0, 500)}`)
    .join("\n");
  return `The user is reflecting after an analytical exercise in domain: ${input.domain}.

Here are short excerpts from their last few journal responses in this same domain:
${joined || "(no prior journals in this domain)"}

Write ONE short sentence (max 220 characters) that optionally connects past reflection to this session, e.g. whether a past theme might apply again. If there are no snippets, output exactly: SKIP

Plain text only, no quotes wrapping the whole sentence.`;
}
