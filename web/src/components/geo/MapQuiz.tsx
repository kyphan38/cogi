"use client";

import { useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeoMap, LineKey, type MapLine, type MapMarker } from "@/components/geo/GeoMap";
import { PLACE_KIND_LABELS, placeQuestion, type Place } from "@/lib/geo/places";
import { REGIONS } from "@/lib/geo/regions";
import { REVIEW_INTERVALS, scoreTap, type GeoQuizAnswer } from "@/lib/geo/quiz";
import type { LonLat } from "@/lib/geo/types";
import { isOnLand } from "@/lib/geo/world";

const fmtKm = (km: number) => `${km.toLocaleString("en-US")} km`;

function feedback(place: Place, a: GeoQuizAnswer): string {
  if (a.tap == null) return "Here it is on the map.";
  if (a.onLand) return `That point is on land, ${fmtKm(a.distanceKm!)} from the right place. A sea answer must be at sea.`;
  if (a.correct) return `Right. Your tap was ${fmtKm(a.distanceKm!)} away.`;
  return `Not quite. Your tap was ${fmtKm(a.distanceKm!)} away. You needed to be within ${fmtKm(place.toleranceKm)}.`;
}

/** The place as marks on the map: a point, or a line with its name at the middle. */
function placeMarks(place: Place): { markers: MapMarker[]; lines: MapLine[] } {
  const label = place.alsoCalled ? `${place.name} (also called ${place.alsoCalled})` : place.name;
  if (place.target.length === 1) {
    return { markers: [{ id: "answer", coords: place.target[0]!, label: place.name, detail: label === place.name ? undefined : label, showLabel: true }], lines: [] };
  }
  const mid = place.target[Math.floor(place.target.length / 2)]!;
  return {
    markers: [{ id: "answer", coords: mid, label: place.name, showLabel: true }],
    lines: [{ id: "answer-line", coords: place.target }],
  };
}

/**
 * The daily map quiz (PLAN-geopolitics.md G2): tap where each place is, see how far
 * off you were, then a short results table. Scored in code by distance.
 */
export function MapQuiz({
  places,
  onFinish,
}: {
  places: Place[];
  /** Called once with every answer, in order; the caller saves the row. */
  onFinish: (answers: GeoQuizAnswer[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<GeoQuizAnswer[]>([]);
  const finished = useRef(false);
  const place = places[index];
  const answer = answers[index];

  const answerWith = (tap: LonLat | null) => {
    if (!place || answer) return;
    const onLand = tap != null && place.kind === "sea" && isOnLand(tap);
    setAnswers((prev) => [...prev, scoreTap(place, tap, onLand)]);
  };

  const next = () => {
    if (index + 1 < places.length) {
      setIndex(index + 1);
      return;
    }
    if (!finished.current) {
      finished.current = true;
      onFinish(answers);
    }
  };

  const marks = useMemo(() => {
    if (!place || !answer) return { markers: [], lines: [] };
    const m = placeMarks(place);
    if (answer.tap) {
      m.markers.push({ id: "tap", coords: answer.tap, label: "Your tap", shape: "tap" });
      if (place.target.length === 1) m.lines.push({ id: "gap", coords: [answer.tap, place.target[0]!], faint: true });
    }
    return m;
  }, [place, answer]);

  if (!place) return null;
  const region = REGIONS[place.region];

  return (
    <div className="space-y-3" data-testid="map-quiz">
      <div className="space-y-1">
        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <span className="tabular-nums" data-testid="quiz-progress">
            Question {index + 1} of {places.length}
          </span>
          <span aria-hidden>·</span>
          <span>{PLACE_KIND_LABELS[place.kind]}</span>
          <span aria-hidden>·</span>
          <span>{region.label}</span>
        </p>
        <p className="text-base font-medium text-zinc-900" data-testid="quiz-question">
          {placeQuestion(place)}
        </p>
        {place.alsoCalled ? <p className="text-muted-foreground text-sm">Also called {place.alsoCalled}.</p> : null}
      </div>

      <GeoMap
        title={`Map of ${region.label}`}
        bbox={region.bbox}
        onTap={answer ? undefined : (p) => answerWith(p)}
        markers={marks.markers}
        lines={marks.lines}
        testId="quiz-map"
      >
        {answer ? (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <svg width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="4" fill="#18181b" stroke="#fff" strokeWidth="1.5" />
              </svg>
              {place.name}
            </span>
            {place.target.length > 1 ? <LineKey label="Where it runs" /> : null}
            {answer.tap ? (
              <span className="inline-flex items-center gap-1.5">
                <svg width="12" height="12" aria-hidden>
                  <path d="M2,2L10,10M10,2L2,10" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Your tap
              </span>
            ) : null}
          </span>
        ) : (
          <>Tap where you think it is. You are right within {fmtKm(place.toleranceKm)}.</>
        )}
      </GeoMap>

      {answer ? (
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-sm" data-testid="quiz-feedback" data-correct={answer.correct ? "true" : "false"}>
            {answer.correct ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0" aria-hidden />}
            <span>{feedback(place, answer)}</span>
          </p>
          <Button type="button" onClick={next} data-testid="quiz-next">
            {index + 1 < places.length ? "Next" : "See results"}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => answerWith(null)} data-testid="quiz-skip">
          I don&apos;t know
        </Button>
      )}
    </div>
  );
}

/** Results after a quiz: score, a table of every answer, and when misses come back. */
export function MapQuizResults({ places, answers }: { places: Place[]; answers: GeoQuizAnswer[] }) {
  const right = answers.filter((a) => a.correct).length;
  return (
    <div className="space-y-3" data-testid="quiz-results">
      <p className="text-2xl font-semibold text-zinc-900">
        {right} of {answers.length}
      </p>
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground text-xs">
          <tr>
            <th className="py-1 font-medium">Place</th>
            <th className="py-1 font-medium">Result</th>
            <th className="py-1 text-right font-medium">Distance</th>
          </tr>
        </thead>
        <tbody>
          {answers.map((a) => {
            const p = places.find((x) => x.id === a.placeId);
            return (
              <tr key={a.placeId} className="border-t border-zinc-100">
                <td className="py-1.5 pr-2">{p?.name ?? a.placeId}</td>
                <td className="py-1.5 pr-2">
                  <span className="inline-flex items-center gap-1">
                    {a.correct ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
                    {a.correct ? "Right" : a.tap ? "Missed" : "Skipped"}
                  </span>
                </td>
                <td className="py-1.5 text-right tabular-nums">{a.distanceKm == null ? "-" : fmtKm(a.distanceKm)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {right < answers.length ? (
        <p className="text-muted-foreground text-sm">
          Places you missed come back in your quiz after {REVIEW_INTERVALS[0]} day, then after {REVIEW_INTERVALS[1]} and{" "}
          {REVIEW_INTERVALS[2]} days.
        </p>
      ) : null}
    </div>
  );
}
