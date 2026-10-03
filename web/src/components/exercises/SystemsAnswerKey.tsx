"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coaching, CoachingFooter, Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import type { SystemsExerciseRow } from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";
import type { SystemsResult } from "@/lib/exercise/systems-score";
import { CONNECTION_TYPE_INFO, IMPACT_LABELS } from "@/lib/exercise/systems-labels";

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
    "nodes" | "intendedConnections" | "shockEvent" | "userEdges" | "confidenceBefore" | "variantKind" | "isGeopolitics"
  >;
  result: SystemsResult;
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
}) {
  const items = useMemo(() => new Map((coaching?.items ?? []).map((it) => [it.ref, it])), [coaching]);
  const label = (id: string) => exercise.nodes.find((n) => n.id === id)?.label ?? id;
  const typeName = (t: keyof typeof CONNECTION_TYPE_INFO) => CONNECTION_TYPE_INFO[t].label;
  const share = Math.round(
    ((result.connectionsTotal ? result.connectionsFound / result.connectionsTotal : 1) +
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
          <Stat label="Links found" value={`${result.connectionsFound}/${result.connectionsTotal}`} />
          <Stat label="Same type and way" value={`${result.connectionsExact}/${result.connectionsTotal}`} />
          <Stat label="Nodes right" value={`${result.impactsCorrect}/${result.impactsTotal}`} />
        </div>
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

        {result.extraEdgeIds.length > 0 ? (
          <Section title="Your other links" hint="Not in the model. Some may still be fair.">
            {result.extraEdgeIds.map((id, i) => {
              const e = exercise.userEdges.find((x) => x.id === id);
              if (!e) return null;
              return (
                <Row
                  key={id}
                  status="neutral"
                  heading={`${label(e.source)} -> ${label(e.target)} (${typeName(e.type)})`}
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
      </CardContent>
    </Card>
  );
}
