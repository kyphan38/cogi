import type { EmbeddedIssue, TagType, ValidPoint } from "@/lib/types/exercise";
import { TAG_CHECK_QUESTIONS, TAG_LABELS } from "@/lib/exercise/tag-labels";

export type DeepDiveTarget =
  | { kind: "issue"; index: number; issue: EmbeddedIssue }
  | { kind: "decoy"; index: number; point: ValidPoint };

/** `issue_<n>` / `decoy_<n>` (1-based, answer-key order) -> the item it names, or null. */
export function resolveDeepDiveRef(
  ref: string,
  embeddedIssues: EmbeddedIssue[],
  validPoints: ValidPoint[],
): DeepDiveTarget | null {
  const m = /^(issue|decoy)_([1-9]\d*)$/.exec(ref);
  if (!m) return null;
  const index = Number(m[2]) - 1;
  if (m[1] === "issue") {
    const issue = embeddedIssues[index];
    return issue ? { kind: "issue", index, issue } : null;
  }
  const point = validPoints[index];
  return point ? { kind: "decoy", index, point } : null;
}

/** Every tag label in the app: an "also called" name must not reuse one. */
export function allTagNames(): string[] {
  return Object.values(TAG_LABELS).map((t) => t.label);
}

function tagName(tag: TagType): string {
  return TAG_LABELS[tag].label;
}

export function buildAnalyticalDeepDivePrompt(input: {
  title: string;
  domain: string;
  passage: string;
  target: DeepDiveTarget;
  /** The short "why" the learner already saw, so the deep dive goes further. */
  why?: string;
  subtypeName?: string;
}): string {
  const { target } = input;
  const seen = input.why?.trim()
    ? `\nShort explanation the learner already saw (do not repeat it; go further):\n"${input.why.trim()}"\n`
    : "";

  const caseBlock =
    target.kind === "issue"
      ? [
          `The sentence: "${target.issue.textSegment}"`,
          `It has a planned problem. Tag: "${tagName(target.issue.type)}"${
            TAG_CHECK_QUESTIONS[target.issue.type] ? ` (question: ${TAG_CHECK_QUESTIONS[target.issue.type]})` : ""
          }.`,
          input.subtypeName?.trim() ? `More specific kind: ${input.subtypeName.trim()}.` : "",
          `Author's note: ${target.issue.explanation}`,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `The sentence: "${target.point.textSegment}"`,
          "It is a SOUND statement. It only looks suspicious.",
          `Author's note: ${target.point.explanation}`,
        ].join("\n");

  const blocked = [
    ...allTagNames().map((n) => `"${n}"`),
    ...(input.subtypeName?.trim() ? [`"${input.subtypeName.trim()}"`] : []),
  ].join(", ");

  const rules =
    target.kind === "issue"
      ? `- "core": 1-2 short sentences. What the sentence quietly takes for granted, and why that step does not follow. Name the specific kind of problem once, with its Vietnamese name in brackets, e.g. "False dilemma (song đề sai)".
- "examples": 2-4 concrete, everyday cases the sentence ignores or gets wrong. One short sentence each. Each case must be a different kind of reason, not the same idea reworded.
- "alsoCalled": 0-2 other common textbook names for this SAME sentence, seen from another angle. Prefer a name that shows a different side of what goes wrong (e.g. for a false dilemma: "Non sequitur" - the conclusion does not follow from the fact), not a plain synonym ("Either-or fallacy" is just another word for false dilemma). At most one plain synonym. Put the Vietnamese name in brackets after the name, e.g. "Non sequitur (kết luận không tất suy)". "note": one short sentence on what that name points at. Never use these names: ${blocked}. Use [] when no name fits well - do not force one.
- "fairer": one sentence. How the writer could say this fairly and keep their point.`
      : `- "core": 1-2 short sentences. Why the sentence can look weak at first: what makes a reader suspicious.
- "examples": 2-4 concrete reasons or facts that make it hold up. One short sentence each.
- "alsoCalled": always [].
- "fairer": one sentence. What change to the sentence would turn it into a real problem, e.g. "If it said tracking spending always fixes money problems, it would claim too much."`;

  return `You are a patient coach for a beginner practising analytical reading in the domain: ${input.domain}.
The learner finished the exercise, saw a short explanation, and asked to "go deeper" on one sentence. Help them truly understand it with concrete, everyday examples.

Exercise title: ${input.title}
Passage:
---
${input.passage}
---

${caseBlock}
${seen}
This is extra explanation only. Do not judge the learner, do not mention scores, and do not add new problems in the passage.

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "core": string,
  "examples": [string] (2-4 items),
  "alsoCalled": [{ "name": string, "note": string }] (0-2 items),
  "fairer": string
}

How to write each field:
${rules}

Tone: warm and plain, like a patient coach. Short sentences. No academic words when a simple one works.`;
}
