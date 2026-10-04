"use client";

import { useMemo } from "react";
import { Check, Minus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AnalyticalExerciseRow } from "@/lib/types/exercise";
import { GEO_LENS_INFO, type GeoAnalyticalLevelConfig, type GeoLens } from "@/lib/exercise/analytical-levels";
import { shuffledOrder } from "@/lib/exercise/guided-candidates";
import type { GeoGuessResult } from "@/lib/exercise/geo-guess";

type Patch = Partial<
  Pick<AnalyticalExerciseRow, "perspectiveChoice" | "actorChoices" | "lensAnswers" | "lensText" | "userPerspectiveGuess">
>;

function Options({
  label,
  options,
  order,
  picked,
  onPick,
  testId,
}: {
  label: string;
  options: string[];
  order: number[];
  picked: number | null | undefined;
  onPick: (i: number) => void;
  testId?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={label} data-testid={testId}>
      {order.map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={picked === i}
          onClick={() => onPick(i)}
          className={cn(
            "rounded-xl border px-3 py-2 text-left text-sm",
            picked === i ? "border-zinc-900 bg-zinc-50 font-medium" : "border-zinc-200 hover:bg-zinc-50",
          )}
        >
          {options[i]}
        </button>
      ))}
    </div>
  );
}

/**
 * Geopolitics step 2 (PLAN-geopolitics.md G1.3-G1.4): whose viewpoint, who is
 * missing, and the four lenses. Guided / Standard pick from lists; Expert writes the
 * viewpoint first and then picks, and writes each lens.
 */
export function GeoGuessStep({
  ex,
  cfg,
  onChange,
}: {
  ex: AnalyticalExerciseRow;
  cfg: GeoAnalyticalLevelConfig;
  onChange: (patch: Patch) => void;
}) {
  const views = ex.perspectiveOptions ?? [];
  const actors = ex.actorCandidates ?? [];
  const viewOrder = useMemo(() => shuffledOrder(views.length, `${ex.id}-views`), [ex.id, views.length]);
  const actorOrder = useMemo(() => shuffledOrder(actors.length, `${ex.id}-actors`), [ex.id, actors.length]);
  const chosenActors = ex.actorChoices ?? [];
  const writeFirst = cfg.guess === "write-then-choose";

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label className="text-sm font-medium">Whose viewpoint is this written from?</Label>
        {writeFirst ? (
          <Textarea
            aria-label="Your guess in your own words"
            rows={2}
            placeholder="In your own words first: who would write it this way, and why?"
            value={ex.userPerspectiveGuess ?? ""}
            onChange={(e) => onChange({ userPerspectiveGuess: e.target.value })}
          />
        ) : null}
        {writeFirst ? <p className="text-muted-foreground text-xs">Now pick the closest:</p> : null}
        <Options
          label="Whose viewpoint"
          testId="perspective-options"
          options={views}
          order={viewOrder}
          picked={ex.perspectiveChoice}
          onPick={(i) => onChange({ perspectiveChoice: i })}
        />
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-medium">Who is affected but never heard? (pick all that fit)</Label>
        <div className="flex flex-wrap gap-2" data-testid="actor-options">
          {actorOrder.map((i) => {
            const a = actors[i]!;
            const on = chosenActors.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange({ actorChoices: on ? chosenActors.filter((x) => x !== a) : [...chosenActors, a] })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
                )}
              >
                {a}
              </button>
            );
          })}
        </div>
      </section>

      {(ex.lensQuestions ?? []).length > 0 ? (
        <section className="space-y-4" data-testid="lens-step">
          <div>
            <p className="text-sm font-medium">Read it through four lenses</p>
            <p className="text-muted-foreground text-xs">
              Each lens asks a different question of the same events. None is the whole truth.
            </p>
          </div>
          {(ex.lensQuestions ?? []).map((q) => {
            const lens = q.lens as GeoLens;
            const order = shuffledOrder(q.options.length, `${ex.id}-lens-${lens}`);
            return (
              <div key={lens} className="space-y-2" data-testid="lens-question">
                <p className="text-muted-foreground text-xs">
                  {GEO_LENS_INFO[lens].name} · {GEO_LENS_INFO[lens].question}
                </p>
                <p className="text-sm text-zinc-900">{q.question}</p>
                {cfg.lenses === "free" ? (
                  <Textarea
                    aria-label={`${GEO_LENS_INFO[lens].name}: ${q.question}`}
                    rows={2}
                    value={ex.lensText?.[lens] ?? ""}
                    onChange={(e) => onChange({ lensText: { ...ex.lensText, [lens]: e.target.value } })}
                  />
                ) : (
                  <Options
                    label={`${GEO_LENS_INFO[lens].name}: ${q.question}`}
                    options={q.options}
                    order={order}
                    picked={ex.lensAnswers?.[lens]}
                    onPick={(i) => onChange({ lensAnswers: { ...ex.lensAnswers, [lens]: i } })}
                  />
                )}
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

/** What is still missing before feedback, or null when the step is complete. */
export function geoGuessMissing(ex: AnalyticalExerciseRow, cfg: GeoAnalyticalLevelConfig): string | null {
  if (cfg.guess === "write-then-choose" && !(ex.userPerspectiveGuess ?? "").trim()) {
    return "Write whose viewpoint you think it is, before you pick.";
  }
  if (ex.perspectiveChoice == null) return "Pick whose viewpoint the passage is written from.";
  if ((ex.actorChoices ?? []).length === 0) return "Pick at least one actor who is missing.";
  for (const q of ex.lensQuestions ?? []) {
    const lens = q.lens as GeoLens;
    const done = cfg.lenses === "free" ? (ex.lensText?.[lens] ?? "").trim().length > 0 : ex.lensAnswers?.[lens] != null;
    if (!done) return `Answer the ${GEO_LENS_INFO[lens].name} lens.`;
  }
  return null;
}

/** Lines for the feedback prompt: each lens, the reading it gives, and the user's. */
export function geoLensLines(ex: AnalyticalExerciseRow, cfg: GeoAnalyticalLevelConfig): string[] {
  return (ex.lensQuestions ?? []).map((q) => {
    const lens = q.lens as GeoLens;
    const user =
      cfg.lenses === "free"
        ? `wrote "${(ex.lensText?.[lens] ?? "").trim()}"`
        : `picked "${q.options[ex.lensAnswers?.[lens] ?? -1] ?? "(nothing)"}"${ex.lensAnswers?.[lens] === q.answerIndex ? " (right)" : " (not the lens's reading)"}`;
    return `- ${GEO_LENS_INFO[lens].name}: ${q.question} Lens reading: "${q.options[q.answerIndex]}". User ${user}.`;
  });
}

const Mark = ({ ok }: { ok: boolean | null }) =>
  ok === null ? (
    <Minus className="text-muted-foreground size-4 shrink-0" aria-hidden />
  ) : ok ? (
    <Check className="size-4 shrink-0" aria-hidden />
  ) : (
    <X className="size-4 shrink-0" aria-hidden />
  );

/** The reveal after feedback: viewpoint, missing actors and each lens, scored in code. */
export function GeoReveal({ ex, guess }: { ex: AnalyticalExerciseRow; guess: GeoGuessResult }) {
  const missing = ex.missingActors ?? [];
  const picked = ex.perspectiveChoice != null ? ex.perspectiveOptions?.[ex.perspectiveChoice] : undefined;
  return (
    <div className="space-y-4 text-sm" data-testid="geo-reveal">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 px-3 py-2">
          <p className="text-lg font-semibold">{guess.perspectiveCorrect ? "Yes" : "No"}</p>
          <p className="text-muted-foreground text-xs">Right viewpoint</p>
        </div>
        <div className="rounded-xl border border-zinc-200 px-3 py-2">
          <p className="text-lg font-semibold tabular-nums">
            {guess.actorsFound}/{guess.actorsTotal}
          </p>
          <p className="text-muted-foreground text-xs">Missing actors found</p>
        </div>
        <div className="rounded-xl border border-zinc-200 px-3 py-2">
          <p className="text-lg font-semibold tabular-nums">{guess.score}</p>
          <p className="text-muted-foreground text-xs">Perspective score (of 100)</p>
        </div>
      </div>
      <p className="flex items-start gap-2">
        <Mark ok={guess.perspectiveCorrect} />
        <span>
          <span className="font-medium">Hidden viewpoint: </span>
          {ex.hiddenPerspective}
          {!guess.perspectiveCorrect && picked ? <span className="text-muted-foreground"> (you picked: {picked})</span> : null}
        </span>
      </p>
      <div>
        <p className="font-medium">Missing actors</p>
        <ul className="mt-1 space-y-1">
          {missing.map((a) => (
            <li key={a} className="flex items-center gap-2">
              <Mark ok={(ex.actorChoices ?? []).some((c) => c.trim().toLowerCase() === a.trim().toLowerCase())} />
              {a}
            </li>
          ))}
        </ul>
        {guess.wrongActors > 0 ? (
          <p className="text-muted-foreground mt-1">
            You also picked {guess.wrongActors} actor{guess.wrongActors === 1 ? "" : "s"} the passage does mention, or
            that do not matter here.
          </p>
        ) : null}
      </div>
      {(ex.lensQuestions ?? []).length > 0 ? (
        <div className="space-y-3">
          <p className="font-medium">Four lenses</p>
          {(ex.lensQuestions ?? []).map((q) => {
            const lens = q.lens as GeoLens;
            const l = guess.lenses.find((x) => x.lens === lens);
            const yours = l?.correct === null ? ex.lensText?.[lens] : q.options[ex.lensAnswers?.[lens] ?? -1];
            return (
              <div key={lens} className="space-y-1" data-testid="lens-reveal">
                <p className="flex items-center gap-2">
                  <Mark ok={l?.correct ?? null} />
                  <span className="font-medium">{GEO_LENS_INFO[lens].name}:</span> {q.options[q.answerIndex]}
                </p>
                {yours && l?.correct !== true ? <p className="text-muted-foreground pl-6">You: {yours}</p> : null}
                <p className="text-muted-foreground pl-6">{q.explanation}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
