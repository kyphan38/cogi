import type { GeoGuessResult } from "@/lib/exercise/geo-guess";
import type {
  AnalyticalResult,
  EmbeddedIssue,
  TagType,
  UserHighlight,
  ValidPoint,
} from "@/lib/types/exercise";
import { TAG_CHECK_QUESTIONS, TAG_LABELS } from "@/lib/exercise/tag-labels";
import { ANALYTICAL_ISSUE_GUIDE, SOUND_REASONING_NAME, type AnalyticalCardKey } from "@/lib/exercise/analytical-issue-guide";

function cardName(key: AnalyticalCardKey): string {
  return key === "sound_reasoning" ? SOUND_REASONING_NAME : TAG_LABELS[key].label;
}

const SEVERITY_WORDS: Record<EmbeddedIssue["severity"], string> = {
  obvious: "easy to spot",
  moderate: "medium",
  subtle: "hard to spot",
};

function tagName(tag: TagType): string {
  return TAG_LABELS[tag].label;
}

function issueVerdict(
  outcome: AnalyticalResult["issues"][number],
  issue: EmbeddedIssue,
): string {
  if (outcome.tagCorrect) return `CORRECT - found it and tagged it "${tagName(issue.type)}".`;
  if (outcome.found) {
    return `FOUND, DIFFERENT TAG - found it but tagged it "${tagName(outcome.userTag!)}"; the planned tag is "${tagName(issue.type)}".`;
  }
  if (outcome.userTag === "valid_point") {
    return "MISSED - highlighted it but marked it as Valid Point (thought it was fine).";
  }
  if (outcome.userTag === "unclear") return "MISSED - highlighted it but marked it as Unclear.";
  return "MISSED - did not highlight it.";
}

function decoyVerdict(outcome: AnalyticalResult["decoys"][number]): string {
  if (outcome.trapped) {
    return `TRAPPED - tagged this sound statement as "${tagName(outcome.userTag!)}".`;
  }
  if (outcome.userTag === "valid_point") return "CORRECT - marked it as Valid Point.";
  if (outcome.userTag === "unclear") return "NEUTRAL - marked it as Unclear.";
  return "NOT TOUCHED - did not highlight it.";
}

/**
 * The cases the AI must explain, one line block per ref. Verdicts come from code
 * (`scoreAnalytical`), so the AI never judges right or wrong itself.
 */
export function buildAnalyticalCoachingCases(input: {
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  highlights: UserHighlight[];
  result: AnalyticalResult;
}): string {
  const byId = new Map(input.highlights.map((h) => [h.id, h]));
  const blocks: string[] = [];
  for (const o of input.result.issues) {
    const issue = input.embeddedIssues[o.index]!;
    blocks.push(
      [
        `issue_${o.index + 1} - planned issue, ${SEVERITY_WORDS[issue.severity]}, tag "${tagName(issue.type)}"`,
        `  Passage text: "${issue.textSegment}"`,
        `  Author's note: ${issue.explanation}`,
        `  User: ${issueVerdict(o, issue)}`,
      ].join("\n"),
    );
  }
  for (const o of input.result.decoys) {
    const vp = input.validPoints[o.index]!;
    blocks.push(
      [
        `decoy_${o.index + 1} - sound statement that only looks suspicious`,
        `  Passage text: "${vp.textSegment}"`,
        `  Author's note: ${vp.explanation}`,
        `  User: ${decoyVerdict(o)}`,
      ].join("\n"),
    );
  }
  input.result.extraHighlightIds.forEach((id, i) => {
    const h = byId.get(id);
    // A plain sentence marked Valid Point or Unclear needs no comment.
    if (!h || h.tag === "valid_point" || h.tag === "unclear") return;
    blocks.push(
      [
        `extra_${i + 1} - the user's own highlight, not one of the planned cases`,
        `  User highlighted: "${h.text}" and tagged it "${tagName(h.tag)}".`,
      ].join("\n"),
    );
  });
  return blocks.join("\n\n");
}

function checkQuestionLines(tags: TagType[]): string {
  return tags
    .filter((t) => TAG_CHECK_QUESTIONS[t])
    .map((t) => `- ${tagName(t)}: ${TAG_CHECK_QUESTIONS[t]}`)
    .join("\n");
}

export function buildAnalyticalPerspectivePrompt(input: {
  title: string;
  passage: string;
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  userHighlights: UserHighlight[];
  result: AnalyticalResult;
  requiredRefs: string[];
  confidenceBefore: number;
  domain: string;
  userContext?: string;
  tagOptions: TagType[];
  hiddenPerspective?: string;
  missingActors?: string[];
  userPerspectiveGuess?: string;
  userMissingActorsGuess?: string[];
  metaGuessScore?: number;
  /** Geopolitics G1: how the picks went, and each lens (question, right reading, user's reading). */
  geoGuess?: GeoGuessResult | null;
  lensLines?: string[];
  /** Issue types that get a "Take with you" card, picked in code (pickIssueCards). */
  cardKeys?: AnalyticalCardKey[];
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  const isGeo = Boolean(input.hiddenPerspective?.trim());
  const problemTags = input.tagOptions.filter((t) => t !== "valid_point" && t !== "unclear");
  const cases = buildAnalyticalCoachingCases({
    embeddedIssues: input.embeddedIssues,
    validPoints: input.validPoints,
    highlights: input.userHighlights,
    result: input.result,
  });
  const r = input.result;
  const cardKeys = input.cardKeys ?? [];
  const cardLines = cardKeys
    .map((k) => `- ${k} (${cardName(k)}): ${ANALYTICAL_ISSUE_GUIDE[k].spot} How to respond to others: ${ANALYTICAL_ISSUE_GUIDE[k].othersTip}`)
    .join("\n");

  const geoBlock = isGeo
    ? `

PERSPECTIVE GUESS (geopolitics):
- Hidden perspective: ${input.hiddenPerspective}
- Missing actors: ${JSON.stringify(input.missingActors ?? [])}
- User's perspective guess: ${input.userPerspectiveGuess?.trim() || "(none)"}
- User's missing-actor guesses: ${JSON.stringify(input.userMissingActorsGuess ?? [])}
${input.geoGuess ? `- Scored in code (final): viewpoint ${input.geoGuess.perspectiveCorrect ? "RIGHT" : "WRONG"}; missing actors ${input.geoGuess.actorsFound}/${input.geoGuess.actorsTotal} found, ${input.geoGuess.wrongActors} picked that are not missing.\n` : ""}${input.lensLines?.length ? `LENSES (the user read the passage through four lenses):\n${input.lensLines.join("\n")}\n` : ""}Write "metaNote": 2-3 short sentences on how close the guesses were and one clue in the text that reveals the viewpoint.${input.lensLines?.length ? " Then one sentence on the lens the user read least well, using the passage." : ""}`
    : "";

  return `You are a friendly coach helping a learner practice analytical reading in the domain: ${input.domain}.
The learner is still building this skill. Your job is to help them see WHY, and to spot it themselves next time.
User context (may be empty): ${ctx}

Exercise title: ${input.title}
Passage:
---
${input.passage}
---

The four problem tags and the question behind each (a "yes" means the tag fits):
${checkQuestionLines(problemTags)}

SCORE (already decided by code - final, do not change or argue with it):
- Found ${r.found} of ${r.total} planned issues; ${r.tagsCorrect} with the planned tag.
- Tagged ${r.trapsHit} of ${r.decoyTotal} sound statements as problems.
- Confidence before feedback: ${input.confidenceBefore}%.

CASES (each verdict is final):
${cases}
${geoBlock}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "analytical_v3",
  "title": string (echo the exercise title),
  "items": [
    {
      "ref": string (a ref from CASES, e.g. "issue_1"),
      "why": string,
      "clue": string,
      "nextTimeAsk": string,
      "subtypeName": string (optional)
    }
  ],
  "takeaways": [] (always empty: the cards below replace them)${isGeo ? `,
  "metaNote": string` : ""},
  "trapCards": [ { "trap": string (a key from TAKE-WITH-YOU CARDS), "othersSay": string, "youCouldSay": string, "elsewhere": { "area": string, "thought": string, "balanced": string } } ] (exactly one per key below, same order)
}

TAKE-WITH-YOU CARDS (the user takes these into real life; the app already shows how to spot each one and what to ask):
${cardLines || "(none)"}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}. You may add items for other refs in CASES, but keep it short.

How to write each item:
- "why": 2-3 short sentences; the last one is a concrete example (see below). Follow the verdict:
  - CORRECT: confirm it plainly ("Yes - ..."), then say why it is a problem. Do not suggest a "better" tag.
  - FOUND, DIFFERENT TAG: say the planned tag fits better and why, using that tag's question. Be kind - they found the problem.
  - MISSED: explain what the problem is, in simple words.
  - TRAPPED: explain why the statement is actually sound.
  - NOT TOUCHED / NEUTRAL decoy: explain briefly why it looks suspicious but holds up.
  - extra: judge fairly whether the concern holds up. If it is reasonable, say so; if not, say gently why not.
  Do not just repeat what the tag means. Make the last sentence ONE concrete, everyday example:
  - for a problem (issue_ items, and an extra that holds up): a real case the passage ignores or gets wrong, e.g. "A couple can trust each other and still keep separate accounts, e.g. one partner is paying off a student loan."
  - for a sound statement (decoy_ items, and an extra that does not hold up): the concrete reason it stands, e.g. "Recording spending for 90 days is a common, tested budgeting step."
- "clue": quote 2-6 words from the passage, then name the signal in plain words. Format: "<quoted words>" - <signal>. Example: "\"single month proves\" - a big rule from one short period". Other signals: an absolute word, a small online poll, a cause claimed from one example. Always include the signal part; no vague phrases like "which forces an unfair choice".
- "nextTimeAsk": one question to ask yourself next time, at most 15 words.
- "subtypeName": usually leave it out. Add it only on an issue_ item, and only when the name is a textbook kind of that issue's planned tag (e.g. "False dilemma" for Logical Fallacy, "Small sample" for Weak Evidence). It is shown as "a type of <planned tag>", so it must truly belong under that tag. Never repeat the tag name, never invent new tags, and use it at most twice per reply.
- Only use the tag names listed above.

How to write each card (plain words, not from this passage):
- "othersSay": one short sentence a colleague, friend, ad or news story might say with this problem.
- "youCouldSay": a polite reply that asks one question about the facts. Never name the issue type and never call it a fallacy. At most 25 words.
- "elsewhere": the same problem in a different area of life than "${input.domain}" (for example work, money, health, news, family). "area" is that area in 1-3 words; "thought" is a claim with the problem; "balanced" is a fairer version of that claim.
- For "sound_reasoning": "othersSay" is a well-supported claim that might look suspicious; "youCouldSay" says what makes it convincing; "elsewhere.thought" is a sound claim that looks suspicious, and "elsewhere.balanced" is why it holds.

Tone: warm and direct, like a patient coach. No numeric scores. No "stronger alternative". No academic words when a simple one works.
Refs (like issue_1, node_3, option_o1) are only for the "ref" field: in the text, always use names, never ids.`;
}
