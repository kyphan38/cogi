"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import type { TrickyExerciseRow } from "@/lib/types/exercise";
import { trickyStepCounts, type TrickyResult } from "@/lib/exercise/tricky-score";
import { TRICKY_STEP_INFO, TRICKY_STEPS } from "@/lib/exercise/tricky-levels";

const QUALITY_LABEL = { best: "Best answer", ok: "Partly there", poor: "Weak answer" } as const;

/**
 * Tricky-question results: per question, the trap, what the user said or picked, and
 * a stronger answer. Written answers also show which of the four steps they used.
 */
export function TrickyAnswerKey({
  exercise,
  result,
}: {
  exercise: Pick<TrickyExerciseRow, "rounds" | "asker" | "picks" | "answers">;
  result: TrickyResult;
}) {
  const write = result.mode === "write";
  const counts = trickyStepCounts(result);
  const n = exercise.rounds.length;

  return (
    <Card data-testid="tricky-answer-key">
      <CardHeader>
        <CardTitle className="text-lead">How you handled it</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-body leading-relaxed">
        <div className="grid grid-cols-2 gap-2">
          <Stat label={write ? "Steps used" : "Score"} value={`${Math.round(result.score * 100)}%`} />
          <Stat
            label={write ? "Questions" : "Best answers picked"}
            value={write ? `${n}` : `${result.rounds.filter((r) => r.quality === "best").length}/${n}`}
          />
        </div>

        {write ? (
          <Section title="The four steps" hint={`How many of the ${n} answers used each step.`}>
            {TRICKY_STEPS.map((s) => (
              <Row
                key={s}
                status={counts[s] === n ? "right" : counts[s] > 0 ? "partly" : "wrong"}
                heading={TRICKY_STEP_INFO[s].name}
                aside={`${counts[s]}/${n}`}
              >
                <p className="text-muted-foreground">{TRICKY_STEP_INFO[s].question}</p>
              </Row>
            ))}
          </Section>
        ) : null}

        <Section title="Question by question">
          {exercise.rounds.map((r, i) => {
            const row = result.rounds[i];
            const best = r.options.find((o) => o.quality === "best");
            const used = row?.steps ? TRICKY_STEPS.filter((s) => row.steps?.[s]).length : 0;
            const status: Status = write
              ? used === TRICKY_STEPS.length
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
              <Row key={i} status={status} heading={`${exercise.asker}: ${r.question}`} aside={write ? `${used}/4 steps` : row?.quality ? QUALITY_LABEL[row.quality] : undefined}>
                <p>
                  <span className="font-medium text-foreground">The trap: </span>
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
                    <span className="font-medium text-foreground">Add: </span>
                    {row.missing}
                  </p>
                ) : null}
                <p>
                  <span className="font-medium text-foreground">{write ? "Stronger: " : "Best answer: "}</span>
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
