"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coaching, CoachingFooter, Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import { OutcomeStories, PayoffMatrix, outcomeNumbers } from "@/components/exercises/PayoffMatrix";
import type { StrategyExerciseRow } from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";
import type { StrategyResult } from "@/lib/exercise/strategy-score";
import { GeoCasePanel } from "@/components/geo/GeoCasePanel";
import { geoGameCaseById } from "@/lib/geo/game-cases";

/**
 * Strategic-situation results: the full matrix with the underline method, then each
 * step the user took (best replies or rankings, the prediction, the extra questions)
 * with the AI's coaching. The game facts come from code.
 */
export function StrategyAnswerKey({
  exercise,
  result,
  coaching,
}: {
  exercise: Pick<StrategyExerciseRow, "players" | "optionsA" | "optionsB" | "cells" | "answers" | "geoCaseId">;
  result: StrategyResult;
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
}) {
  const items = useMemo(() => new Map((coaching?.items ?? []).map((it) => [it.ref, it])), [coaching]);
  const A = exercise.players.find((p) => p.id === "A")!;
  const B = exercise.players.find((p) => p.id === "B")!;
  const numbers = outcomeNumbers(exercise);
  const outcomes = (keys: string[]) => (keys.length ? keys.map((k) => `Outcome ${numbers.get(k)}`).join(", ") : "none");
  const optA = (id: string) => exercise.optionsA.find((o) => o.id === id)?.label ?? id;
  const optB = (id: string) => exercise.optionsB.find((o) => o.id === id)?.label ?? id;
  const f = result.facts;
  const brRight = result.bestReplies.filter((b) => b.correct).length;
  const gameCase = geoGameCaseById(exercise.geoCaseId);

  return (
    <Card data-testid="strategy-answer-key">
      <CardHeader>
        <CardTitle className="text-lg">How the game works out</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed">
        <div className="grid grid-cols-2 gap-2">
          {result.bestReplies.length > 0 ? (
            <Stat label="Best replies right" value={`${brRight}/${result.bestReplies.length}`} />
          ) : result.rankCloseness ? (
            <Stat
              label="Preferences close"
              value={`${Math.round(((result.rankCloseness.A + result.rankCloseness.B) / 2) * 100)}%`}
            />
          ) : null}
          <Stat label="Outcome predicted" value={result.predictionCorrect ? "Yes" : "No"} />
        </div>

        <div className="space-y-2">
          <PayoffMatrix game={exercise} showPayoffs facts={f} testId="answer-matrix" />
          <p className="text-muted-foreground text-xs">
            Underlined: each side&apos;s best reply to what the other does. Where both numbers are underlined, neither
            side wants to change - that is the equilibrium.
          </p>
          <OutcomeStories game={exercise} />
        </div>

        {result.bestReplies.length > 0 ? (
          <Section title="Best replies">
            {result.bestReplies.map((b) => {
              const [player, opp] = b.key.split(":") as ["A" | "B", string];
              const who = player === "A" ? A.name : B.name;
              const other = player === "A" ? `${B.name} picks ${optB(opp)}` : `${A.name} picks ${optA(opp)}`;
              const want = player === "A" ? optA(f.bestA[opp]!) : optB(f.bestB[opp]!);
              return (
                <Row
                  key={b.key}
                  status={b.correct ? "right" : "wrong"}
                  heading={`${who}, if ${other}`}
                  aside={`Best: ${want}`}
                >
                  <Coaching item={items.get(`br_${player}_${opp}`)} fallback="" />
                </Row>
              );
            })}
          </Section>
        ) : null}

        {result.rankCloseness ? (
          <Section title="What each side prefers">
            {(["A", "B"] as const).map((p) => {
              const close = result.rankCloseness![p];
              const status: Status = close === 1 ? "right" : close >= 0.75 ? "partly" : "wrong";
              return (
                <Row key={p} status={status} heading={p === "A" ? A.name : B.name} aside={`${Math.round(close * 100)}% close`}>
                  <Coaching item={items.get(`rank_${p}`)} fallback="" />
                </Row>
              );
            })}
          </Section>
        ) : null}

        <Section title="Where they end up">
          <Row
            status={result.predictionCorrect ? "right" : result.predictionConsistent ? "partly" : "wrong"}
            heading={`You: ${outcomes(exercise.answers?.prediction ?? [])}`}
            aside={`Equilibrium: ${outcomes(f.nash)}`}
          >
            {!result.predictionCorrect && result.predictionConsistent ? (
              <p className="text-muted-foreground">
                Your prediction follows from your own ranking - the logic is right; the preferences differ.
              </p>
            ) : null}
            <Coaching item={items.get("prediction")} fallback="" />
          </Row>
        </Section>

        {result.dominant ? (
          <Section title="Dominant choices" hint="A choice that is best whatever the other side does.">
            {(["A", "B"] as const).map((p) => {
              const truth = p === "A" ? (f.dominantA ? optA(f.dominantA) : "none") : f.dominantB ? optB(f.dominantB) : "none";
              return (
                <Row
                  key={p}
                  status={result.dominant![p] ? "right" : "wrong"}
                  heading={p === "A" ? A.name : B.name}
                  aside={`Answer: ${truth}`}
                >
                  <Coaching item={items.get(`dominant_${p}`)} fallback="" />
                </Row>
              );
            })}
          </Section>
        ) : null}

        {result.betterCorrect !== null ? (
          <Section title="Better for both">
            <Row
              status={result.betterCorrect ? "right" : "wrong"}
              heading={`You: ${outcomes(exercise.answers?.betterForBoth ?? [])}`}
              aside={`Answer: ${outcomes(f.betterForBoth)}`}
            >
              <Coaching item={items.get("better")} fallback="" />
            </Row>
          </Section>
        ) : null}

        <CoachingFooter coaching={coaching} metaTitle="Your reason" />

        {gameCase ? <GeoCasePanel gameCase={gameCase} /> : null}
      </CardContent>
    </Card>
  );
}
