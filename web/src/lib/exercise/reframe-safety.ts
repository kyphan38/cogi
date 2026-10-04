/**
 * Reframe "My situation" safety check (PLAN-psychology.md P1). The model also flags
 * `safety: "concern"`, but this check runs first and does not depend on the model:
 * clear crisis words stop the exercise before anything is generated.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)? my ?self\b/i,
  /\bend(ing)? (my|my own) life\b/i,
  /\bend(ing)? it all\b/i,
  /\b(want|wish|wanted) to die\b/i,
  /\bself[- ]?harm/i,
  /\b(cut|cutting|hurt|hurting|harm|harming) myself\b/i,
  /\bno reason to live\b/i,
  /\bbetter off (dead|without me)\b/i,
];

export function hasCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

/** Shown instead of an exercise when a situation needs real support. */
export const REFRAME_SUPPORT_MESSAGE = {
  title: "This needs more than an exercise",
  lines: [
    "What you wrote sounds heavy. Reframe is for everyday thinking practice, and it is not the right tool for this.",
    "If you are thinking about hurting yourself, or you are in danger, contact local emergency services now.",
    "Please talk to someone you trust today. A doctor or a mental health professional can also help.",
  ],
} as const;
