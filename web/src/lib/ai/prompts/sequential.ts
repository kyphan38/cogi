import { buildDomainHint, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

export function buildSequentialGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const topicLine = scenarioBlock
    ? `${scenarioBlock}\n\nCreate a process-ordering exercise with **8 steps** directly about this situation.`
    : `Generate a ${input.domain} process-ordering exercise with **8 steps**.`;

  return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}${domainHint}

${topicLine}

Requirements:
- Steps should have clear dependencies (A must happen before B)
- Include 2-3 steps where order is genuinely flexible (mark isFlexible: true on those steps)
- Include 1 "trap" step that SEEMS like it should be first but actually depends on something else
- Use step ids like "s1", "s2", ... "s8" (short unique strings, no spaces)

Return a single JSON object with this exact shape:
{
  "title": string,
  "scenario": string (2-3 sentences of context),
  "steps": [
    {
      "id": string,
      "text": string (the step description),
      "correctPosition": number (0-based final order index),
      "dependencies": string[] (ids of steps that must appear before this one; may be empty only for true first steps),
      "isFlexible": boolean,
      "explanation": string (why this position in the ideal order)
    }
  ],
  "criticalErrors": [
    {
      "description": string (e.g. if step X is placed before step Y, what goes wrong),
      "severity": "catastrophic" | "problematic" | "suboptimal"
    }
  ]
}

steps must have exactly 8 items.
criticalErrors must have at least 1 item.${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildGeopoliticsSequentialPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const topicLine = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nDesign a dual-actor process-ordering exercise with **8 steps** grounded in this scenario.`
    : `Generate a geopolitical process-ordering exercise about **${input.domain}** with **8 steps**.`;

  return `You are generating a geopolitical sequential-thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}${domainHint}

${topicLine}

This exercise teaches that "correct order" depends on whose priorities you're optimizing for. Two actors face
the SAME 8 steps (same crisis or process) but their genuinely optimal sequences diverge because they weigh
risk, legitimacy, and speed differently (e.g. a diplomacy-first sequence vs a deterrence-first sequence).

Requirements:
- perspectiveAName and perspectiveBName: name two real or clearly-defined actors (states, coalitions, institutions) who must differ
- Use step ids like "s1", "s2", ... "s8" (short unique strings, no spaces) - the SAME 8 steps apply to both actors
- correctPosition: Actor A's ideal 0-based order index for this step
- correctPositionB: Actor B's ideal 0-based order index for the SAME step - must be a genuinely different ordering from Actor A's in at least half the steps, not a cosmetic relabeling
- dependencies: hard prerequisites that hold regardless of actor (physical/procedural, not preference-based)
- isFlexible: true for steps where order is genuinely interchangeable for BOTH actors
- criticalErrors: what goes wrong if Actor A's priorities are violated by a bad order
- criticalErrorsB: what goes wrong if Actor B's priorities are violated by a bad order (must be distinct from criticalErrors, not a copy)

Return a single JSON object with this exact shape:
{
  "title": string,
  "scenario": string (2-3 sentences of context naming both actors),
  "perspectiveAName": string,
  "perspectiveBName": string,
  "steps": [
    {
      "id": string,
      "text": string (the step description, actor-neutral),
      "correctPosition": number (0-based order index for Actor A),
      "correctPositionB": number (0-based order index for Actor B),
      "dependencies": string[] (ids of steps that must appear before this one for either actor; may be empty),
      "isFlexible": boolean,
      "explanation": string (why this position makes sense for Actor A; contrast with B implicitly)
    }
  ],
  "criticalErrors": [
    { "description": string, "severity": "catastrophic" | "problematic" | "suboptimal" }
  ],
  "criticalErrorsB": [
    { "description": string, "severity": "catastrophic" | "problematic" | "suboptimal" }
  ]
}

steps must have exactly 8 items. correctPosition and correctPositionB must each be a permutation of 0-7.
criticalErrors and criticalErrorsB must each have at least 1 item.${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildSequentialTriagePrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint = buildDomainHint(input.domain);
  const topicLine = scenarioBlock
    ? `${scenarioBlock}${domainHint}\n\nDesign a crisis-triage process-ordering exercise with **8 steps** grounded in this scenario.`
    : `Generate a crisis-triage process-ordering exercise about **${input.domain}** with **8 steps**.`;

  return `You are generating a crisis-triage sequential-thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}${domainHint}

${topicLine}

This exercise teaches that under time pressure, not all ordering mistakes are equally costly: getting a
high-severity step out of place matters far more than getting a low-severity one exactly right.

Requirements:
- Steps should have clear dependencies (A must happen before B)
- Assign each step a severity: "critical" (getting this wrong is catastrophic), "major" (significant but
  recoverable), or "minor" (low-stakes, mostly cosmetic ordering). Across the 8 steps include at least 2
  "critical", at least 2 "major", and at least 1 "minor" step.
- timeLimitMinutes: a tight but plausible time budget proportional to the scenario's real-world pace (favor
  short windows - this is a triage exercise, not a leisurely process)
- Include 1-2 steps where order is genuinely flexible (mark isFlexible: true)
- Use step ids like "s1", "s2", ... "s8" (short unique strings, no spaces)
- Do NOT reveal severity levels or the time limit's rationale inside scenario or step text - severity must
  only be discoverable by reasoning about the stakes described in each step's explanation after the fact

Return a single JSON object with this exact shape:
{
  "title": string,
  "scenario": string (2-3 sentences establishing urgency and stakes),
  "variantKind": "triage",
  "timeLimitMinutes": number (integer, 1-180),
  "steps": [
    {
      "id": string,
      "text": string (the step description),
      "correctPosition": number (0-based final order index),
      "dependencies": string[] (ids of steps that must appear before this one; may be empty only for true first steps),
      "isFlexible": boolean,
      "severity": "critical" | "major" | "minor",
      "explanation": string (why this position, and why this severity)
    }
  ],
  "criticalErrors": [
    { "description": string, "severity": "catastrophic" | "problematic" | "suboptimal" }
  ]
}

steps must have exactly 8 items with a permutation correctPosition of 0-7. Include at least 2 "critical",
2 "major", and 1 "minor" severity steps. criticalErrors must have at least 1 item.${adapt ? `\n\n${adapt}` : ""}`;
}
