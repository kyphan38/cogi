import type {
  AnalyticalResult,
  EmbeddedIssue,
  TagType,
  UserHighlight,
  ValidPoint,
} from "@/lib/types/exercise";
import { TAG_CHECK_QUESTIONS, TAG_LABELS } from "@/lib/exercise/tag-labels";

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

  const geoBlock = isGeo
    ? `

PERSPECTIVE GUESS (geopolitics):
- Hidden perspective: ${input.hiddenPerspective}
- Missing actors: ${JSON.stringify(input.missingActors ?? [])}
- User's perspective guess: ${input.userPerspectiveGuess?.trim() || "(none)"}
- User's missing-actor guesses: ${JSON.stringify(input.userMissingActorsGuess ?? [])}
Write "metaNote": 2-3 short sentences on how close the guesses were and one clue in the text that reveals the viewpoint.`
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
  "takeaways": [string] (1-2 items)${isGeo ? `,
  "metaNote": string` : ""}
}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}. You may add items for other refs in CASES, but keep it short.

How to write each item:
- "why": at most 2 short sentences. Follow the verdict:
  - CORRECT: confirm it plainly ("Yes - ..."), then say why it is a problem. Do not suggest a "better" tag.
  - FOUND, DIFFERENT TAG: say the planned tag fits better and why, using that tag's question. Be kind - they found the problem.
  - MISSED: explain what the problem is, in simple words.
  - TRAPPED: explain why the statement is actually sound.
  - NOT TOUCHED / NEUTRAL decoy: explain briefly why it looks suspicious but holds up.
  - extra: judge fairly whether the concern holds up. If it is reasonable, say so; if not, say gently why not.
- "clue": the words in the passage that signal it (quote 2-6 words), and what kind of signal they are.
- "nextTimeAsk": one question to ask yourself next time, at most 15 words.
- "subtypeName": usually leave it out. Add it only on an issue_ item, and only when the name is a textbook kind of that issue's planned tag (e.g. "False dilemma" for Logical Fallacy, "Small sample" for Weak Evidence). It is shown as "a type of <planned tag>", so it must truly belong under that tag. Never repeat the tag name, never invent new tags, and use it at most twice per reply.
- Only use the tag names listed above.

"takeaways": 1-2 short lessons to carry to the next exercise. Focus on MISSED issues and TRAPPED statements first. If everything was correct, say what to keep doing.

Tone: warm and direct, like a patient coach. No numeric scores. No "stronger alternative". No academic words when a simple one works.`;
}
