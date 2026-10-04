"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { CloseTheStrait } from "@/components/geo/CloseTheStrait";
import { MapQuiz, MapQuizResults } from "@/components/geo/MapQuiz";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import type { ChokepointId, RouteId } from "@/lib/geo/chokepoints";
import { listGeoLabRows, requestStraitExplanation, saveGeoLabRow } from "@/lib/geo/client";
import type { Place } from "@/lib/geo/places";
import { localDay, pickQuizPlaces, QUIZ_LENGTH, reviewCounts, type GeoQuizAnswer } from "@/lib/geo/quiz";
import { makeQuizRow, makeStraitRow, placesAskedOn, quizAttempts, quizDoneOn, quizRows } from "@/lib/geo/rows";
import type { StraitResult } from "@/lib/geo/strait";
import type { Exercise, GeoLabExerciseRow } from "@/lib/types/exercise";

type View =
  | { kind: "home" }
  | { kind: "quiz"; places: Place[]; startedAt: string }
  | { kind: "results"; places: Place[]; answers: GeoQuizAnswer[] }
  | { kind: "strait"; startedAt: string };

/**
 * Geo Lab (PLAN-geopolitics.md G2): a daily map quiz with spaced review, and "Close
 * the strait". Every fact comes from a fixed, sourced data set in lib/geo.
 */
export default function GeoLabPage() {
  const { show: showToast } = useToast();
  const [rows, setRows] = useState<Exercise[] | null>(null);
  const [view, setView] = useState<View>({ kind: "home" });
  const straitRow = useRef<GeoLabExerciseRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    listGeoLabRows()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e) => {
        logFirestoreQueryError("GeoLabPage", "listGeoLabRows", e);
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = localDay(new Date());
  const attempts = quizAttempts(rows ?? []);
  const { due } = reviewCounts(attempts, today);
  const doneToday = quizDoneOn(rows ?? [], today);
  const lastToday = quizRows(rows ?? []).filter((r) => localDay(new Date(r.completedAt!)) === today).at(-1);

  const save = async (row: GeoLabExerciseRow) => {
    try {
      await saveGeoLabRow(row);
      setRows((prev) => [row, ...(prev ?? []).filter((r) => r.id !== row.id)]);
    } catch (e) {
      console.error("[GeoLab] save failed", e);
      showToast("Could not save this result. Check your connection.", "error");
    }
  };

  const startQuiz = () => {
    const places = pickQuizPlaces({
      attempts,
      today,
      exclude: doneToday ? placesAskedOn(rows ?? [], today) : undefined,
    });
    setView({ kind: "quiz", places, startedAt: new Date().toISOString() });
    window.scrollTo({ top: 0 });
  };

  const finishQuiz = (places: Place[], startedAt: string, answers: GeoQuizAnswer[]) => {
    void save(makeQuizRow(answers, startedAt));
    setView({ kind: "results", places, answers });
    window.scrollTo({ top: 0 });
  };

  const startedAt = view.kind === "strait" ? view.startedAt : "";
  const finishStrait = useCallback(
    (input: { chokepointId: ChokepointId; picked: string[]; route: RouteId | null; result: StraitResult }) => {
      const row = makeStraitRow(input, startedAt || new Date().toISOString());
      straitRow.current = row;
      void save(row);
    },
    // save only uses stable setters and the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startedAt],
  );

  const explain = useCallback(
    async (input: { chokepointId: ChokepointId; picked: string[]; route: RouteId | null }) => {
      const explanation = await requestStraitExplanation(input);
      const row = straitRow.current;
      if (row?.strait && row.strait.chokepointId === input.chokepointId) {
        const withNote: GeoLabExerciseRow = { ...row, strait: { ...row.strait, explanation } };
        straitRow.current = withNote;
        void save(withNote);
      }
      return explanation;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Geo Lab</h1>
        <p className="text-muted-foreground text-sm">
          Learn where places are and why they matter. Guess first, then see the answer. Every fact comes from a checked
          source, linked under the answer.
        </p>
        {view.kind !== "home" ? (
          <button
            type="button"
            className="text-sm underline underline-offset-4"
            onClick={() => setView({ kind: "home" })}
            data-testid="geo-back"
          >
            Back to Geo Lab
          </button>
        ) : null}
      </div>

      {view.kind === "home" ? (
        <>
          <Card data-testid="geo-quiz-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily map quiz</CardTitle>
              <p className="text-muted-foreground text-sm">
                {QUIZ_LENGTH} places, about 2 minutes. Tap where each one is on the map.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {rows == null ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : doneToday && lastToday ? (
                <p data-testid="geo-quiz-status">
                  Done for today: {lastToday.quiz?.filter((a) => a.correct).length ?? 0} of {lastToday.quiz?.length ?? 0}. Come back
                  tomorrow, or play another round.
                </p>
              ) : due > 0 ? (
                <p data-testid="geo-quiz-status">
                  {due} {due === 1 ? "place" : "places"} to review today, from earlier misses.
                </p>
              ) : null}
              <Button
                type="button"
                variant={doneToday ? "outline" : "default"}
                disabled={rows == null}
                onClick={startQuiz}
                data-testid="geo-quiz-start"
              >
                {doneToday ? "Another round" : "Start today's quiz"}
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="geo-strait-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Close the strait</CardTitle>
              <p className="text-muted-foreground text-sm">
                Imagine a key sea route is closed. Guess which countries are hit hardest and how ships get around it.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={() => setView({ kind: "strait", startedAt: new Date().toISOString() })}
                data-testid="geo-strait-start"
              >
                Play
              </Button>
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs">
            The map shows country shapes only. It does not name disputed areas. Where a sea has more than one common name,
            the quiz gives both.
          </p>
        </>
      ) : null}

      {view.kind === "quiz" ? (
        <MapQuiz places={view.places} onFinish={(answers) => finishQuiz(view.places, view.startedAt, answers)} />
      ) : null}

      {view.kind === "results" ? (
        <div className="space-y-4">
          <MapQuizResults places={view.places} answers={view.answers} />
          <Button type="button" onClick={() => setView({ kind: "home" })} data-testid="geo-results-done">
            Done
          </Button>
        </div>
      ) : null}

      {view.kind === "strait" ? <CloseTheStrait onFinish={finishStrait} requestExplanation={explain} /> : null}
    </main>
  );
}
