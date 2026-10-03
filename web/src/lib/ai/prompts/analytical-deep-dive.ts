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

  const rules =
    target.kind === "issue"
      ? `- "core": 2-3 short sentences. First, what the sentence quietly takes for granted. Then, in plain words, why its conclusion does not follow from the facts it gives. Name the specific kind of problem once, e.g. "This is a false dilemma". Do not add other textbook names.
- "examples": 2-4 concrete, everyday cases the sentence ignores or gets wrong. One short sentence each. Each case must be a different kind of reason, not the same idea reworded.
- "fairer": one sentence. How the writer could say this fairly and keep their point.`
      : `- "core": 1-2 short sentences. Why the sentence can look weak at first: what makes a reader suspicious.
- "examples": 2-4 concrete reasons or facts that make it hold up. One short sentence each.
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
  "fairer": string
}

How to write each field:
${rules}

Language: English only, in every field. No words, translations or names in any other language (no Vietnamese).
Tone: warm and plain, like a patient coach. Short sentences. No academic words when a simple one works.`;
}
