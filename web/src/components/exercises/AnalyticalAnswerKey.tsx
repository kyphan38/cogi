"use client";

import { useMemo, type ReactNode } from "react";
import { Check, Minus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  AnalyticalExerciseRow,
  AnalyticalResult,
  TagType,
} from "@/lib/types/exercise";
import type { AnalyticalCoachingItem, AnalyticalCoachingStructured } from "@/lib/types/perspective";
import { TAG_LABELS } from "@/lib/exercise/tag-labels";
import {
  calibrationLine,
  decoyMarker,
  orderedIssues,
  passagePieces,
  SEVERITY_LABELS,
} from "@/lib/exercise/answer-key";

type Status = "right" | "partly" | "wrong" | "neutral";

function StatusIcon({ status }: { status: Status }) {
  const Icon = status === "wrong" ? X : status === "neutral" ? Minus : Check;
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0", status === "neutral" ? "text-muted-foreground" : "text-foreground")}
      strokeWidth={status === "right" ? 2.5 : 2}
    />
  );
}

function Marker({ children }: { children: ReactNode }) {
  return (
    <span className="border-foreground/30 text-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border px-1 text-[11px] font-medium tabular-nums">
      {children}
    </span>
  );
}

function tagName(tag: TagType): string {
  return TAG_LABELS[tag].label;
}

function Coaching({ item, fallback }: { item?: AnalyticalCoachingItem; fallback: string }) {
  if (!item) return <p className="text-muted-foreground">{fallback}</p>;
  return (
    <div className="space-y-1">
      <p>{item.why}</p>
      <p className="text-muted-foreground">
        <span className="text-foreground font-medium">Clue: </span>
        {item.clue}
      </p>
      <p className="text-muted-foreground">
        <span className="text-foreground font-medium">Next time, ask: </span>
        {item.nextTimeAsk}
      </p>
    </div>
  );
}

function Row({
  marker,
  status,
  heading,
  aside,
  quote,
  children,
}: {
  marker?: string;
  status: Status;
  heading: string;
  aside?: string;
  quote: string;
  children: ReactNode;
}) {
  return (
    <li className="border-muted space-y-2 border-b py-4 first:pt-0 last:border-0 last:pb-0" data-testid="answer-key-row">
      <div className="flex items-center gap-2">
        {marker ? <Marker>{marker}</Marker> : null}
        <StatusIcon status={status} />
        <span className="text-foreground font-medium">{heading}</span>
        {aside ? <span className="text-muted-foreground ml-auto text-xs">{aside}</span> : null}
      </div>
      <p className="text-muted-foreground italic">&ldquo;{quote}&rdquo;</p>
      {children}
    </li>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-foreground font-semibold">{title}</h3>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
      <ul className="list-none pl-0">{children}</ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-muted rounded-xl border px-3 py-2">
      <p className="text-foreground text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

/**
 * Answer key after an analytical exercise: what was planned, what the user found,
 * and (when present) the AI's coaching for each case. Right and wrong come from
 * `result`, which code computed; the AI text only explains.
 */
export function AnalyticalAnswerKey({
  exercise,
  result,
  coaching,
}: {
  exercise: Pick<
    AnalyticalExerciseRow,
    "passage" | "embeddedIssues" | "validPoints" | "userHighlights" | "confidenceBefore"
  >;
  result: AnalyticalResult;
  coaching: AnalyticalCoachingStructured | null;
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
            This passage had no planned issues. The reasoning was sound - the skill here is not
            flagging statements that only look suspicious.
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
                </Row>
              );
            })}
          </Section>
        ) : null}

        {extras.length > 0 ? (
          <Section title="Your other highlights" hint="Not one of the planned cases. Some may still be fair points.">
            {extras.map(({ h, ref }) => (
              <Row key={h!.id} status="neutral" heading={`Your tag: ${tagName(h!.tag)}`} quote={h!.text}>
                <Coaching item={items.get(ref)} fallback="Not one of the planned issues." />
              </Row>
            ))}
          </Section>
        ) : null}

        {coaching?.metaNote ? (
          <section className="space-y-1">
            <h3 className="text-foreground font-semibold">Perspective</h3>
            <p>{coaching.metaNote}</p>
          </section>
        ) : null}

        {coaching && coaching.takeaways.length > 0 ? (
          <section className="space-y-2" data-testid="answer-key-takeaways">
            <h3 className="text-foreground font-semibold">Take with you</h3>
            <ul className="list-disc space-y-1 pl-5">
              {coaching.takeaways.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
