"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { ALT_ROUTES, chokepointById } from "@/lib/geo/chokepoints";
import { countryName } from "@/lib/geo/countries";
import { placeById } from "@/lib/geo/places";
import { timelineById } from "@/lib/geo/timelines";
import type { GeoLabExerciseRow } from "@/lib/types/exercise";

const names = (ids: string[]) => (ids.length ? ids.map((id) => countryName(id) ?? id).join(", ") : "none");

/** History review of one Geo Lab row: quiz answers, or a "Close the strait" guess. */
export function GeoLabHistoryCard({ row }: { row: GeoLabExerciseRow }) {
  if (row.variant === "map_quiz") {
    const answers = row.quiz ?? [];
    return (
      <div className="space-y-2" data-testid="history-geo-quiz">
        <p className="font-medium">
          Map quiz: {answers.filter((a) => a.correct).length} of {answers.length}
        </p>
        <ul className="space-y-1">
          {answers.map((a) => (
            <li key={a.placeId} className="flex items-center gap-2">
              {a.correct ? <Check className="size-3.5 shrink-0" aria-label="Right" /> : <X className="size-3.5 shrink-0" aria-label="Missed" />}
              <span className="min-w-0 flex-1">{placeById(a.placeId)?.name ?? a.placeId}</span>
              <span className="text-muted-foreground tabular-nums">{a.distanceKm == null ? "skipped" : `${a.distanceKm.toLocaleString("en-US")} km`}</span>
            </li>
          ))}
        </ul>
        <Link href="/geo" className="text-xs underline underline-offset-4">
          Open the Geo Lab
        </Link>
      </div>
    );
  }
  if (row.variant === "timeline") {
    const t = row.timeline;
    const tl = t ? timelineById(t.caseId) : undefined;
    if (!t || !tl) return null;
    return (
      <div className="space-y-2" data-testid="history-geo-timeline">
        <p className="font-medium">{tl.title}</p>
        <ul className="space-y-1">
          {t.answers.map((a) => {
            const d = tl.decisions.find((x) => x.id === a.decisionId);
            return (
              <li key={a.decisionId}>
                {d?.question} You chose: {d?.options.find((o) => o.id === a.optionId)?.text ?? a.optionId} ({a.confidence}% sure).{" "}
                <span className="font-medium">{a.verdict === "close" ? "Close to history." : "Different from history."}</span>
              </li>
            );
          })}
        </ul>
        <p>
          Order: {t.orderCorrect} of {t.orderTotal} in the right place.
          {t.offRampCorrect != null ? ` Off-ramp: ${t.offRampCorrect ? "found" : "missed"}.` : ""}
        </p>
      </div>
    );
  }
  const s = row.strait;
  if (!s) return null;
  const cp = chokepointById(s.chokepointId);
  return (
    <div className="space-y-2" data-testid="history-geo-strait">
      <p className="font-medium">{cp?.name ?? s.chokepointId} closed</p>
      <p>Found: {names(s.result.found)}</p>
      <p>Missed: {names(s.result.missed)}</p>
      {s.result.extra.length ? <p>Not on the list: {names(s.result.extra)}</p> : null}
      <p>
        Your way around: {s.route ? ALT_ROUTES[s.route].label : "none"} ({s.result.routeCorrect ? "right" : "not the main one"})
      </p>
      {s.explanation ? (
        <div className="space-y-1">
          <h3 className="font-medium">Coach&apos;s note</h3>
          <p>{s.explanation.summary}</p>
          <ul className="list-disc space-y-1 pl-5">
            {s.explanation.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
