"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Coaching,
  CoachingFooter,
  Row,
  Section,
  Stat,
  type Status,
} from "@/components/shared/AnswerKeyParts";
import type {
  AnalyticalExerciseRow,
  AnalyticalResult,
  TagType,
} from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, AnalyticalDeepDive } from "@/lib/types/perspective";
import { DeepDivePanel } from "@/components/exercises/DeepDivePanel";
import { TakeWithYouCards } from "@/components/shared/TakeWithYouCards";
import { ANALYTICAL_ISSUE_GUIDE, SOUND_REASONING_NAME } from "@/lib/exercise/analytical-issue-guide";
import { pickIssueCards } from "@/lib/exercise/analytical-issue-cards";
import { TAG_LABELS } from "@/lib/exercise/tag-labels";
import {
  calibrationLine,
  decoyMarker,
  orderedIssues,
  passagePieces,
  SEVERITY_LABELS,
} from "@/lib/exercise/answer-key";

function tagName(tag: TagType): string {
  return TAG_LABELS[tag].label;
}

const CARD_LABELS = { self: "When you read or decide", elsewhere: "Same issue, other place", balanced: "Fairer version" };

/**
 * Answer key after an analytical exercise: what was planned, what the user found,
 * and (when present) the AI's coaching for each case. Right and wrong come from
 * `result`, which code computed; the AI text only explains. With `onRequestDeepDive`,
 * each planned issue and trap gets a "Go deeper" button (saved in `deepDives`).
 */
export function AnalyticalAnswerKey({
  exercise,
  result,
  coaching,
  deepDives,
  onRequestDeepDive,
}: {
  exercise: Pick<
    AnalyticalExerciseRow,
    "passage" | "embeddedIssues" | "validPoints" | "userHighlights" | "confidenceBefore"
  >;
  result: AnalyticalResult;
  coaching: AnalyticalCoachingStructured | null;
  deepDives?: Record<string, AnalyticalDeepDive>;
  onRequestDeepDive?: (ref: string) => Promise<void>;
}) {
  const { passage, embeddedIssues, validPoints, userHighlights } = exercise;
  const issues = useMemo(
    () => orderedIssues(result, embeddedIssues, passage),
    [result, embeddedIssues, passage],
  );
  const pieces = useMemo(
    () => passagePieces({ passage, issues, validPoints, highlights: userHighlights }),
    [passage, issues, validPoints, userHighlights],
  );
  const items = useMemo(
    () => new Map((coaching?.items ?? []).map((it) => [it.ref, it])),
    [coaching],
  );
  const byId = useMemo(() => new Map(userHighlights.map((h) => [h.id, h])), [userHighlights]);
  const calibration = calibrationLine(exercise.confidenceBefore, result);
  // Extra highlights marked Valid Point or Unclear agree that a plain sentence is fine
  // (common in the guided walkthrough), so only problem-tagged extras are listed. The
  // `extra_<n>` ref keeps its index into `result.extraHighlightIds`.
  const extras = result.extraHighlightIds
    .map((id, i) => ({ h: byId.get(id), ref: `extra_${i + 1}` }))
    .filter((e) => e.h && e.h.tag !== "valid_point" && e.h.tag !== "unclear");
  const found = result.issues.filter((i) => i.found).length;

  return (
    <Card data-testid="analytical-answer-key">
      <CardHeader>
        <CardTitle className="text-lg">Answer key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed">
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Issues found"
            value={result.total > 0 ? `${result.found}/${result.total}` : "-"}
          />
          <Stat label="Right tag" value={found > 0 ? `${result.tagsCorrect}/${found}` : "-"} />
          <Stat label="Traps hit" value={`${result.trapsHit}/${result.decoyTotal}`} />
        </div>
        {result.total === 0 ? (
          <p className="text-muted-foreground">
            No planned issues: the reasoning was sound.
          </p>
        ) : null}
        {calibration ? <p className="text-muted-foreground">{calibration}</p> : null}

        <div>
          <p className="text-muted-foreground mb-2 text-xs">
            Numbers mark planned issues, letters mark traps. Shaded text is what you highlighted.
          </p>
          <div
            data-testid="answer-key-passage"
            className="border-muted whitespace-pre-wrap rounded-2xl border p-4 text-base leading-relaxed"
          >
            {pieces.map((p, i) => (
              <span key={i}>
                <span
                  className={cn(
                    p.user && "bg-foreground/10 rounded-sm",
                    p.issue && "decoration-foreground underline decoration-2 underline-offset-4",
                    !p.issue && p.decoy && "decoration-muted-foreground underline decoration-dashed underline-offset-4",
                  )}
                >
                  {p.text}
                </span>
                {p.markerAfter ? (
                  <sup className="text-foreground ml-0.5 text-[10px] font-semibold">{p.markerAfter}</sup>
                ) : null}
              </span>
            ))}
          </div>
        </div>

        {issues.length > 0 ? (
          <Section title="Planned issues" hint="Easiest first.">
            {issues.map(({ outcome, issue, marker }) => {
              const item = items.get(`issue_${outcome.index + 1}`);
              const status: Status = outcome.tagCorrect ? "right" : outcome.found ? "partly" : "wrong";
              const heading = outcome.tagCorrect
                ? "Found, right tag"
                : outcome.found
                  ? "Found, different tag"
                  : "Missed";
              return (
                <Row
                  key={outcome.index}
                  marker={marker}
                  status={status}
                  heading={heading}
                  aside={SEVERITY_LABELS[issue.severity]}
                  quote={issue.textSegment}
                >
                  <p>
                    <span className="text-foreground font-medium">Tag: {tagName(issue.type)}</span>
                    {item?.subtypeName ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · More specific: {item.subtypeName}, a type of {tagName(issue.type)}
                      </span>
                    ) : null}
                  </p>
                  {outcome.userTag && !outcome.tagCorrect ? (
                    <p className="text-muted-foreground">
                      {outcome.found ? "You tagged it: " : "You marked it: "}
                      {tagName(outcome.userTag)}
                    </p>
                  ) : null}
                  <Coaching item={item} fallback={issue.explanation} />
                  {onRequestDeepDive ? (
                    <DeepDivePanel
                      kind="issue"
                      deepDive={deepDives?.[`issue_${outcome.index + 1}`]}
                      onRequest={() => onRequestDeepDive(`issue_${outcome.index + 1}`)}
                    />
                  ) : null}
                </Row>
              );
            })}
          </Section>
        ) : null}

        {result.decoys.length > 0 ? (
          <Section title="Traps" hint="Sound statements that only look suspicious.">
            {result.decoys.map((d) => {
              const vp = validPoints[d.index]!;
              const status: Status = d.trapped ? "wrong" : d.userTag === "valid_point" ? "right" : "neutral";
              const heading = d.trapped
                ? `Trapped: you tagged it ${tagName(d.userTag!)}`
                : d.userTag === "valid_point"
                  ? "You marked it as Valid Point"
                  : d.userTag === "unclear"
                    ? "You marked it as Unclear"
                    : "Not highlighted";
              return (
                <Row key={d.index} marker={decoyMarker(d.index)} status={status} heading={heading} quote={vp.textSegment}>
                  <Coaching item={items.get(`decoy_${d.index + 1}`)} fallback={vp.explanation} />
                  {onRequestDeepDive ? (
                    <DeepDivePanel
                      kind="decoy"
                      deepDive={deepDives?.[`decoy_${d.index + 1}`]}
                      onRequest={() => onRequestDeepDive(`decoy_${d.index + 1}`)}
                    />
                  ) : null}
                </Row>
              );
            })}
          </Section>
        ) : null}

        {extras.length > 0 ? (
          <Section title="Your other highlights" hint="Not planned. Some may still be fair.">
            {extras.map(({ h, ref }) => (
              <Row key={h!.id} status="neutral" heading={`Your tag: ${tagName(h!.tag)}`} quote={h!.text}>
                <Coaching item={items.get(ref)} fallback="Not one of the planned issues." />
              </Row>
            ))}
          </Section>
        ) : null}

        <CoachingFooter coaching={coaching} />
        <TakeWithYouCards
          entries={pickIssueCards(embeddedIssues, result).map((k) =>
            k === "sound_reasoning"
              ? { key: k, name: SOUND_REASONING_NAME, guide: ANALYTICAL_ISSUE_GUIDE[k], labels: { elsewhere: "Looks suspicious, but holds", balanced: "Why it holds" } }
              : { key: k, name: tagName(k), guide: ANALYTICAL_ISSUE_GUIDE[k] },
          )}
          cards={coaching?.trapCards}
          labels={CARD_LABELS}
        />
      </CardContent>
    </Card>
  );
}
