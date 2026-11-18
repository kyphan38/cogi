"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import type { HumorExerciseRow } from "@/lib/types/exercise";
import { humorStepCounts, type HumorResult } from "@/lib/exercise/humor-score";
import { HUMOR_STEP_INFO, HUMOR_STEPS } from "@/lib/exercise/humor-levels";

const QUALITY_LABEL = { best: "Best reply", ok: "Partly there", poor: "Weak reply" } as const;

/**
 * Light-replies results: per moment, the common mistake, what the user said or picked,
 * and a better reply. Written replies also show which of the four checks they passed.
 */
export function HumorAnswerKey({
  exercise,
  result,
}: {
  exercise: Pick<HumorExerciseRow, "rounds" | "picks" | "answers">;
  result: HumorResult;
}) {
  const write = result.mode === "write";
  const counts = humorStepCounts(result);
  const n = exercise.rounds.length;

  return (
    <Card data-testid="humor-answer-key">
      <CardHeader>
        <CardTitle className="text-lead">How your replies landed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-body leading-relaxed">
        <div className="grid grid-cols-2 gap-2">
          <Stat label={write ? "Checks passed" : "Score"} value={`${Math.round(result.score * 100)}%`} />
          <Stat
            label={write ? "Moments" : "Best replies picked"}
            value={write ? `${n}` : `${result.rounds.filter((r) => r.quality === "best").length}/${n}`}
          />
        </div>

        {write ? (
          <Section title="The four checks" hint={`How many of the ${n} replies passed each check.`}>
            {HUMOR_STEPS.map((s) => (
              <Row
                key={s}
                status={counts[s] === n ? "right" : counts[s] > 0 ? "partly" : "wrong"}
                heading={HUMOR_STEP_INFO[s].name}
                aside={`${counts[s]}/${n}`}
              >
                <p className="text-muted-foreground">{HUMOR_STEP_INFO[s].question}</p>
              </Row>
            ))}
          </Section>
        ) : null}

        <Section title="Moment by moment">
          {exercise.rounds.map((r, i) => {
            const row = result.rounds[i];
            const best = r.options.find((o) => o.quality === "best");
            const used = row?.steps ? HUMOR_STEPS.filter((s) => row.steps?.[s]).length : 0;
            const status: Status = write
              ? used === HUMOR_STEPS.length
                ? "right"
                : used >= 2
                  ? "partly"
                  : "wrong"
              : row?.quality === "best"
                ? "right"
                : row?.quality === "ok"
                  ? "partly"
                  : "wrong";
            const yours = write ? exercise.answers?.[i]?.trim() : row?.picked != null ? r.options[row.picked]?.text : "";
            return (
              <Row
                key={i}
                status={status}
                heading={r.moment}
                aside={write ? `${used}/4 checks` : row?.quality ? QUALITY_LABEL[row.quality] : undefined}
              >
                {r.serious ? <p className="font-medium text-foreground">Serious moment: no joke here.</p> : null}
                <p>
                  <span className="font-medium text-foreground">Common mistake: </span>
                  {r.trap}. {r.trapWhy}
                </p>
                {yours ? <p className="text-muted-foreground">You: {yours}</p> : null}
                {row?.strong ? (
                  <p>
                    <span className="font-medium text-foreground">Works: </span>
                    {row.strong}
                  </p>
                ) : null}
                {row?.missing ? (
                  <p>
                    <span className="font-medium text-foreground">Change: </span>
                    {row.missing}
                  </p>
                ) : null}
                <p>
                  <span className="font-medium text-foreground">{write ? "Better: " : "Best reply: "}</span>
                  {write ? (row?.better ?? best?.text) : best?.text}
                </p>
                {!write && best ? <p className="text-muted-foreground">{best.why}</p> : null}
              </Row>
            );
          })}
        </Section>

        {result.overall ? (
          <section className="space-y-1">
            <h3 className="font-semibold text-foreground">Overall</h3>
            <p>{result.overall}</p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
