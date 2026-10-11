"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coaching, CoachingFooter, Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import type { SystemsExerciseRow } from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";
import { soundLinks, type SystemsResult } from "@/lib/exercise/systems-score";
import { findLoops } from "@/lib/exercise/systems-loops";
import { CONNECTION_TYPE_INFO, IMPACT_LABELS } from "@/lib/exercise/systems-labels";
import { SYSTEMS_IDEA_GUIDE, SYSTEMS_IDEA_NAMES } from "@/lib/exercise/systems-idea-guide";
import { pickSystemsCards, systemsCriticality } from "@/lib/exercise/systems-idea-cards";
import { TakeWithYouCards } from "@/components/shared/TakeWithYouCards";
import { SystemsLoopList } from "@/components/exercises/SystemsLoopList";

const CARD_LABELS = { self: "When you plan or decide", elsewhere: "Same idea, other place", balanced: "With the idea in mind" };

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Systems results after feedback: how the map and the shock compare with the model,
 * with the AI's coaching on each row. Right and different come from `result` (code).
 */
export function SystemsAnswerKey({
  exercise,
  result,
  coaching,
}: {
  exercise: Pick<
    SystemsExerciseRow,
    | "nodes"
    | "intendedConnections"
    | "shockEvent"
    | "userEdges"
    | "confidenceBefore"
    | "variantKind"
    | "isGeopolitics"
    | "criticalityGroundTruth"
    | "userCriticalityRanking"
    | "lookAhead"
  >;
  result: SystemsResult;
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
}) {
  const items = useMemo(() => new Map((coaching?.items ?? []).map((it) => [it.ref, it])), [coaching]);
  const label = (id: string) => exercise.nodes.find((n) => n.id === id)?.label ?? id;
  const typeName = (t: keyof typeof CONNECTION_TYPE_INFO) => CONNECTION_TYPE_INFO[t].label;
  const lookAheadLoop = (loop: string[] | null) => {
    if (!loop) return "No key loop picked";
    const l = findLoops(exercise.userEdges.map((e) => ({ from: e.source, to: e.target, type: e.type }))).find(
      (x) => x.nodes.join(">") === loop.join(">"),
    );
    return `Key loop: ${[...loop, loop[0]!].map(label).join(" -> ")}${l?.kind ? ` (${l.kind})` : ""}`;
  };
  const sound = soundLinks(result);
  const fairIds = new Set(result.extraFairIds ?? []);
  const judged = result.extraFairIds != null;
  const share = Math.round(
    ((sound.total ? sound.sound / sound.total : 1) +
      (result.impactsTotal ? result.impactsCorrect / result.impactsTotal : 1)) *
      50,
  );

  return (
    <Card data-testid="systems-answer-key">
      <CardHeader>
        <CardTitle className="text-lg">Compared with the model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Sound links" value={`${sound.sound}/${sound.total}`} />
          <Stat label="Right sign" value={`${result.connectionsExact}/${result.connectionsTotal}`} />
          <Stat label="Affected nodes right" value={`${result.impactsCorrect}/${result.impactsTotal}`} />
        </div>
        <p className="text-muted-foreground">
          Sound links: the model&apos;s links you found, plus your own links that hold up.
        </p>
        {exercise.confidenceBefore != null ? (
          <p className="text-muted-foreground">
            You felt {exercise.confidenceBefore}% sure; overall you matched the model on {share}%.
          </p>
        ) : null}

        <Section title="Under the shock" hint={exercise.shockEvent.description}>
          {result.impacts.map((i) => {
            const status: Status = i.correct ? "right" : "wrong";
            return (
              <Row
                key={i.nodeId}
                status={status}
                heading={label(i.nodeId)}
                aside={i.correct ? capitalize(IMPACT_LABELS[i.expected]) : undefined}
              >
                {!i.correct ? (
                  <p className="text-muted-foreground">
                    You said {IMPACT_LABELS[i.user]}; the model says {IMPACT_LABELS[i.expected]}.
                  </p>
                ) : null}
                <Coaching item={items.get(`node_${i.nodeId}`)} fallback="" />
              </Row>
            );
          })}
        </Section>

        {result.spread && result.spread.length > 0 ? (
          <Section title="How the shock spreads" hint="The node each indirect effect comes through.">
            {result.spread.map((s) => (
              <Row
                key={s.nodeId}
                status={s.correct ? "right" : "wrong"}
                heading={`${label(s.nodeId)} (through ${label(s.via)})`}
                aside={s.correct ? "Same path as the model" : `Model: ${s.possibleVia.map(label).join(" or ") || "-"}`}
              >
                <Coaching item={items.get(`via_${s.nodeId}`)} fallback="" />
              </Row>
            ))}
          </Section>
        ) : null}

        <Section title="The model's links" hint="Arrow A -> B, with the kind of link.">
          {result.connections.map((c) => {
            const ic = exercise.intendedConnections[c.index]!;
            const status: Status = c.exact ? "right" : c.found ? "partly" : "wrong";
            const aside = !c.found
              ? "Missed"
              : c.direction === "reversed"
                ? "Drawn the other way"
                : c.exact
                  ? "Found"
                  : `You said: ${typeName(c.userType!)}`;
            return (
              <Row
                key={c.index}
                status={status}
                heading={`${label(ic.from)} -> ${label(ic.to)} (${typeName(ic.type)})`}
                aside={aside}
              >
                <Coaching item={items.get(`conn_${c.index + 1}`)} fallback={ic.explanation} />
              </Row>
            );
          })}
        </Section>

        <SystemsLoopList links={exercise.intendedConnections} label={label} title="Loops in the model's map" />

        {exercise.lookAhead ? (
          <Section title="Looking ahead" hint="Your key loop, forecast and fix.">
            <Row status="neutral" heading={lookAheadLoop(exercise.lookAhead.loop)}>
              <p>
                <span className="text-muted-foreground">In 5 years: </span>
                {exercise.lookAhead.forecast}
              </p>
              <p>
                <span className="text-muted-foreground">Better fix: </span>
                {exercise.lookAhead.fix}
              </p>
              <Coaching item={items.get("look_ahead")} fallback="Compare your loop with the model's loops above." />
            </Row>
          </Section>
        ) : null}

        {result.extraEdgeIds.length > 0 ? (
          <Section title="Your other links" hint="Not in the model. A fair one counts as a sound link.">
            {result.extraEdgeIds.map((id, i) => {
              const e = exercise.userEdges.find((x) => x.id === id);
              if (!e) return null;
              const fair = fairIds.has(id);
              return (
                <Row
                  key={id}
                  status={!judged ? "neutral" : fair ? "right" : "wrong"}
                  heading={`${label(e.source)} -> ${label(e.target)} (${typeName(e.type)})`}
                  aside={!judged ? undefined : fair ? "Fair link" : "Doubtful"}
                >
                  <Coaching item={items.get(`extra_${i + 1}`)} fallback="Not in the model's map." />
                </Row>
              );
            })}
          </Section>
        ) : null}

        <CoachingFooter
          coaching={coaching}
          metaTitle={exercise.variantKind === "resilience" ? "Criticality and cascade" : "Second perspective"}
        />
        <TakeWithYouCards
          entries={pickSystemsCards({
            intendedConnections: exercise.intendedConnections,
            result,
            criticality:
              exercise.variantKind === "resilience"
                ? systemsCriticality(exercise.criticalityGroundTruth, exercise.userCriticalityRanking)
                : null,
          }).map((k) => ({ key: k, name: SYSTEMS_IDEA_NAMES[k], guide: SYSTEMS_IDEA_GUIDE[k] }))}
          cards={coaching?.trapCards}
          labels={CARD_LABELS}
        />
      </CardContent>
    </Card>
  );
}
