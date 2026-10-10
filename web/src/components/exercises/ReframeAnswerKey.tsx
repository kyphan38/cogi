"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coaching, CoachingFooter, Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import type { ReframeExerciseRow } from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";
import type { ReframeResult, ReframeThoughtOutcome } from "@/lib/exercise/reframe-score";
import { answerName } from "@/lib/exercise/reframe-levels";
import { pickTrapCards } from "@/lib/exercise/reframe-trap-cards";
import { ReframeTrapCards } from "@/components/exercises/ReframeTrapCards";

function thoughtStatus(o: ReframeThoughtOutcome): Status {
  if (o.trap === "realistic") return o.trapped ? "wrong" : "right";
  if (o.tagMatched) return "right";
  return o.found ? "partly" : "wrong";
}

/**
 * Reframe results: each thought with its trap (or "Realistic"), what the user picked,
 * the rewrite, and the AI's coaching. Finding a trap counts more than its exact name.
 */
export function ReframeAnswerKey({
  exercise,
  result,
  coaching,
}: {
  exercise: Pick<
    ReframeExerciseRow,
    | "thoughts"
    | "rewrite"
    | "rewriteChoice"
    | "balancedThought"
    | "evidenceFor"
    | "evidenceAgainst"
    | "feeling"
    | "intensityBefore"
    | "intensityAfter"
  >;
  result: ReframeResult;
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
}) {
  const items = useMemo(() => new Map((coaching?.items ?? []).map((it) => [it.ref, it])), [coaching]);
  const target = exercise.thoughts.find((t) => t.id === exercise.rewrite.thoughtId);
  const feeling =
    exercise.feeling && exercise.intensityBefore != null
      ? `${exercise.intensityBefore} → ${exercise.intensityAfter ?? exercise.intensityBefore}`
      : "-";

  return (
    <Card data-testid="reframe-answer-key">
      <CardHeader>
        <CardTitle className="text-lg">Thinking traps: the answer key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Traps found" value={`${result.found}/${result.total}`} />
          <Stat label="Right name" value={`${result.tagsMatched}/${result.total}`} />
          <Stat
            label="Fair thoughts kept"
            value={result.realisticTotal > 0 ? `${result.realisticTotal - result.trapsHit}/${result.realisticTotal}` : "-"}
          />
          <Stat label={exercise.feeling ? `${exercise.feeling}, before → after` : "Feeling"} value={feeling} />
        </div>
        <p className="text-muted-foreground">
          Spotting a trap matters more than its name.
        </p>

        <Section title="Thoughts">
          {exercise.thoughts.map((t, i) => {
            const o = result.thoughts.find((x) => x.id === t.id)!;
            return (
              <Row
                key={t.id}
                marker={String(i + 1)}
                status={thoughtStatus(o)}
                heading={answerName(t.trap)}
                // The heading already names the answer; say what the user picked only when it differs.
                aside={!o.userAnswer ? "Not marked" : o.userAnswer === t.trap ? undefined : `You: ${answerName(o.userAnswer)}`}
                quote={t.text}
              >
                <Coaching item={items.get(`thought_${t.id}`)} fallback={t.why} />
              </Row>
            );
          })}
        </Section>

        <Section title="Your balanced thought" hint={target ? `Rewriting: "${target.text}"` : undefined}>
          {result.rewriteCorrect === null ? (
            <Row status="neutral" heading="What you wrote" quote={exercise.balancedThought?.trim() || "(nothing)"}>
              {exercise.evidenceFor?.trim() ? (
                <p className="text-muted-foreground">Evidence for: {exercise.evidenceFor.trim()}</p>
              ) : null}
              {exercise.evidenceAgainst?.trim() ? (
                <p className="text-muted-foreground">Evidence against: {exercise.evidenceAgainst.trim()}</p>
              ) : null}
              <p>
                <span className="text-foreground font-medium">A reference version: </span>
                {exercise.rewrite.balancedExample}
              </p>
              <Coaching item={items.get("rewrite")} fallback="" />
            </Row>
          ) : (
            <Row
              status={result.rewriteCorrect ? "right" : "wrong"}
              heading={result.rewriteCorrect ? "You picked the balanced thought" : "Another option is more balanced"}
              quote={exercise.rewriteChoice != null ? exercise.rewrite.options[exercise.rewriteChoice] : undefined}
            >
              {!result.rewriteCorrect ? (
                <p>
                  <span className="text-foreground font-medium">Balanced: </span>
                  {exercise.rewrite.options[exercise.rewrite.answerIndex]}
                </p>
              ) : null}
              <Coaching item={items.get("rewrite")} fallback={exercise.rewrite.explanation} />
            </Row>
          )}
        </Section>

        <CoachingFooter coaching={coaching} metaTitle="One more thing" />
        <ReframeTrapCards
          traps={pickTrapCards(exercise.thoughts, exercise.rewrite, result)}
          cards={coaching && "trapCards" in coaching ? coaching.trapCards : undefined}
        />
      </CardContent>
    </Card>
  );
}
