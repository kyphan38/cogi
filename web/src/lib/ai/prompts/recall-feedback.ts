export function buildRecallFeedbackPrompt(input: {
  exerciseTitle: string;
  summary: string;
  userRecall: string;
}): string {
  return `The user completed an exercise earlier. They are doing a 30-second delayed recall.

Exercise title: ${input.exerciseTitle}
Short original context summary:
${input.summary}

Their one-line recall of the main insight:
${input.userRecall}

Reply in plain text (under 120 words): one sentence acknowledging alignment or a gentle correction, then one tip to strengthen retention. No JSON.`;
}
