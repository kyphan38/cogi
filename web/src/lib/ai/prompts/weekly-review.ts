import type { WeeklyReviewClientPayload } from "@/lib/insights/build-weekly-review-payload";

export function buildWeeklyReviewPrompt(payload: WeeklyReviewClientPayload): string {
  const exBlock = payload.exercises
    .map(
      (e, i) =>
        `### Exercise ${i + 1}\n- type: ${e.type}\n- domain: ${e.domain}\n- title: ${e.title}\n- completedAt: ${e.completedAt}\n- summary:\n${e.summary}\n- aiPerspectiveSnippet:\n${e.aiPerspectiveSnippet || "(none)"}\n- journalBlob:\n${e.journalBlob || "(none)"}`,
    )
    .join("\n\n");

  const decBlock =
    payload.decisions.length === 0
      ? "(none)"
      : payload.decisions
          .map(
            (d, i) =>
              `### Decision ${i + 1}\n- domain: ${d.domain}\n- followUpNoteFilled: ${d.followUpNoteFilled}\n- text:\n${d.text}`,
          )
          .join("\n\n");

  const actBlock =
    payload.actions.length === 0
      ? "(none)"
      : payload.actions
          .map(
            (a, i) =>
              `### Action ${i + 1}\n- exerciseTitle: ${a.exerciseTitle}\n- createdAt: ${a.createdAt}\n- oneAction:\n${a.oneAction}`,
          )
          .join("\n\n");

  const hist = payload.emotionHistogram ?? {};
  const emo =
    Object.keys(hist).length > 0 ? JSON.stringify(hist) : "(none)";
  const dis = payload.perspectiveDisagreementCount ?? 0;

  return `You are a reflective coach summarizing a LOCAL batch of the user's thinking practice.

Input covers ONLY the last 7 completed exercises (with journal snippets), up to 3 recent real-world decisions, and action-bridge items from the last 14 days.

## Affect & disagreement signals (Phase 6)
- Journal emotion counts (exercise window): ${emo}
- Perspective disagreements recorded in this window: ${dis}

## Exercises (7)
${exBlock}

## Real decisions (up to 3)
${decBlock}

## Actions (last 14 days)
${actBlock}

Write plain **markdown** (no JSON) with these sections in order — use headings exactly:

## This week's patterns
(2–4 bullets)

## Your calibration
(One short paragraph: improved or worsened by domain where evidence exists; if sparse, say so.)

## Recurring blind spot
(One paragraph — pattern from journals / perspectives)

## Suggested focus for next week
(Name one thinking type + one domain to practice next.)

Keep total output under ~800 words. Collaborative tone, not a grade.`;
}
