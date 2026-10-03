"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { ExerciseShell, practicePhase, practiceStepLabels } from "@/components/shared/ExerciseShell";
import { ExerciseStepCard, EXERCISE_STEP_META_BADGE } from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionCard } from "@/components/shared/LevelSuggestionCard";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { ConceptList, LearnFirst } from "@/components/exercises/LearnFirst";
import { RankList } from "@/components/exercises/RankList";
import { JudgmentAnswerKey } from "@/components/exercises/JudgmentAnswerKey";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { getExercise, putExercise } from "@/lib/db/exercises";
import { completePracticeExercise } from "@/lib/db/complete-exercise";
import {
  dismissLevelSuggestion,
  getLanguageLevelForRequest,
  getPracticeLevel,
  getUserContext,
  setPracticeLevel,
} from "@/lib/db/settings";
import { isJudgmentExercise, type JudgmentExerciseRow } from "@/lib/types/exercise";
import { isCoachingStructured, type AIPerspectiveStructured } from "@/lib/types/perspective";
import type { JudgmentExercisePayload } from "@/lib/ai/validators/judgment";
import { useSaveOnLeave } from "@/lib/hooks/useSaveOnLeave";
import {
  JUDGMENT_LEVELS,
  LENS_INFO,
  LIFE_AREAS,
  type JudgmentContext,
} from "@/lib/exercise/judgment-levels";
import { scoreJudgment } from "@/lib/exercise/judgment-score";
import { shuffledOrder } from "@/lib/exercise/guided-candidates";
import {
  DEFAULT_PRACTICE_LEVEL,
  LEVEL_LABELS,
  type LevelSuggestion,
  type PracticeLevel,
} from "@/lib/exercise/levels";
import { levelSuggestionFor } from "@/lib/exercise/level-suggestion";

type FlowStep = 0 | 1 | 4 | 7;
/** Internal step that shows AI feedback (the 3rd practice phase); 7 is "saved". */
const FEEDBACK_STEP = 4;

const PART_LABELS = {
  learn: "Part 1 of 3 · Learn first",
  lenses: "Part 2 of 3 · Three lenses",
  respond: "Part 3 of 3 · Choose a response",
} as const;

function ChoiceButtons({
  options,
  order,
  picked,
  answer,
  reveal,
  onPick,
  label,
}: {
  options: string[];
  order: number[];
  picked: number | undefined;
  answer: number;
  /** Show right / not right once picked (Guided). */
  reveal: boolean;
  onPick: (i: number) => void;
  label: string;
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label={label}>
      {order.map((oi) => {
        const isPicked = picked === oi;
        const showAnswer = reveal && picked != null && oi === answer;
        return (
          <button
            key={oi}
            type="button"
            role="radio"
            aria-checked={isPicked}
            disabled={reveal && picked != null}
            onClick={() => onPick(oi)}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm disabled:cursor-default",
              showAnswer || (!reveal && isPicked) ? "border-zinc-900 bg-zinc-50" : isPicked ? "border-zinc-400" : "border-zinc-200 hover:bg-zinc-50",
            )}
          >
            {showAnswer ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
            {reveal && isPicked && oi !== answer ? <X className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
            <span>{options[oi]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Life situations through three lenses (PLAN-learning.md L1). */
export function JudgmentExerciseFlow({
  resumeId,
  initialDomain,
}: {
  resumeId?: string;
  initialDomain?: string;
  initialSource?: "generated" | "real_data" | "custom_scenario";
  autoGenerate?: boolean;
} = {}) {
  const { show: showToast } = useToast();
  const [step, setStep] = useState<FlowStep>(0);
  const [level, setLevel] = useState<PracticeLevel>(DEFAULT_PRACTICE_LEVEL);
  const [area, setArea] = useState(initialDomain?.trim() || "Work");
  const [context, setContext] = useState<JudgmentContext>("vietnam");
  const [source, setSource] = useState<"generated" | "custom_scenario">("generated");
  const [ownSituation, setOwnSituation] = useState("");
  const [exercise, setExercise] = useState<JudgmentExerciseRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(50);
  const [lensIndex, setLensIndex] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [perspectiveStructured, setPerspectiveStructured] = useState<AIPerspectiveStructured | null>(null);
  const [takeaway, setTakeaway] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion>(null);

  const setupLevel = JUDGMENT_LEVELS[level];
  const cfg = exercise ? JUDGMENT_LEVELS[exercise.level] : setupLevel;

  useEffect(() => {
    void getPracticeLevel("judgment").then(setLevel);
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    void (async () => {
      const row = await getExercise(resumeId);
      if (!row || row.completedAt || !isJudgmentExercise(row)) return;
      setExercise(row);
      setConfidence(row.confidenceBefore ?? 50);
      setTakeaway(row.takeaway ?? "");
      if (row.aiPerspectiveStructured) setPerspectiveStructured(row.aiPerspectiveStructured);
      setStep(row.aiPerspective ? FEEDBACK_STEP : 1);
    })();
  }, [resumeId]);

  const pendingSave = useSaveOnLeave();
  /** Update the row; the effect below saves it a second after the last change. */
  const save = (patch: Partial<JudgmentExerciseRow>) => {
    setExercise((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  useEffect(() => {
    if (!exercise || step !== 1) {
      pendingSave.clear();
      return;
    }
    const row = exercise;
    const run = () => void putExercise(row);
    pendingSave.set(run);
    const timer = setTimeout(() => {
      pendingSave.clear();
      run();
    }, 1000);
    return () => clearTimeout(timer);
  }, [exercise, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseLevel = (next: PracticeLevel) => {
    setLevel(next);
    void setPracticeLevel("judgment", next);
    if (!JUDGMENT_LEVELS[next].ownSituation) setSource("generated");
  };

  const generate = async () => {
    setError(null);
    if (source === "custom_scenario" && ownSituation.trim().length < 40) {
      setError("Describe your situation in a few sentences (at least 40 characters).");
      return;
    }
    if (!area.trim()) {
      setError("Pick an area of life.");
      return;
    }
    setLoading(true);
    try {
      const [userContext, languageLevel] = await Promise.all([getUserContext(), getLanguageLevelForRequest()]);
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: "judgment",
          domain: area.trim(),
          context,
          level,
          mode: source,
          customScenario: source === "custom_scenario" ? ownSituation.trim() : undefined,
          userContext: userContext || undefined,
          languageLevel,
        }),
      });
      const json = await safeAiJson<{ ok: true; data: JudgmentExercisePayload } | { ok: false; error: string }>(res);
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const id = crypto.randomUUID();
      const data = json.data;
      const row: JudgmentExerciseRow = {
        id,
        type: "judgment",
        domain: area.trim(),
        context,
        customScenario: source === "custom_scenario" ? ownSituation.trim() : undefined,
        title: data.title,
        scenario: data.scenario,
        concepts: data.concepts,
        conceptChecks: data.conceptChecks,
        lensQuestions: data.lensQuestions,
        responses: data.responses,
        level,
        part: "learn",
        conceptAnswers: [],
        lensAnswers: {},
        lensText: {},
        // The model tends to list the best response first, so start from a shuffled order.
        userOrder: shuffledOrder(data.responses.length, id).map((i) => data.responses[i]!.id),
        userWhy: "",
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 1,
      };
      await putExercise(row);
      setExercise(row);
      setLensIndex(0);
      setPerspectiveStructured(null);
      setTakeaway("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  };

  const getFeedback = async () => {
    if (!exercise) return;
    setError(null);
    if (exercise.userWhy?.trim().length === 0 && cfg.lensMode !== "one-by-one") {
      setError("Write one sentence on why you picked your first choice.");
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: JudgmentExerciseRow = { ...exercise, confidenceBefore: confidence };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "judgment", exercise: row, userContext: userContext || undefined }),
      });
      const parsed = parsePerspectiveFetchJson(await safeAiJson<unknown>(res), "analytical");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const result = scoreJudgment({
        responses: row.responses,
        userOrder: row.userOrder ?? [],
        lensQuestions: row.lensQuestions,
        lensAnswers: row.lensAnswers ?? {},
        lensFreeText: cfg.lensMode === "free",
      });
      const next: JudgmentExerciseRow = {
        ...row,
        result,
        aiPerspective: parsed.text,
        aiPerspectiveStructured: parsed.structured,
        currentStep: FEEDBACK_STEP,
      };
      await putExercise(next);
      setExercise(next);
      setPerspectiveStructured(parsed.structured);
      setStep(FEEDBACK_STEP);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feedback failed");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (!exercise || finishing) return;
    pendingSave.clear();
    setFinishing(true);
    try {
      const saved = (await completePracticeExercise({ exercise, takeaway })) as JudgmentExerciseRow;
      setExercise(saved);
      setStep(7);
      void levelSuggestionFor("judgment", saved.level)
        .then(setLevelSuggestion)
        .catch(() => setLevelSuggestion(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFinishing(false);
    }
  };

  const lensOrders = useMemo(
    () =>
      exercise
        ? Object.fromEntries(
            exercise.lensQuestions.map((q) => [q.lens, shuffledOrder(q.options.length, `${exercise.id}-${q.lens}`)]),
          )
        : {},
    [exercise],
  );

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;
  const lensAnswers = exercise?.lensAnswers ?? {};
  const lensText = exercise?.lensText ?? {};
  const lensesDone =
    exercise != null &&
    exercise.lensQuestions.every((q) =>
      cfg.lensMode === "free" ? (lensText[q.lens] ?? "").trim().length > 0 : lensAnswers[q.lens] != null,
    );

  const scenarioBlock = exercise ? (
    <div className="space-y-2">
      <div className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900">
        {exercise.scenario}
      </div>
      <button
        type="button"
        className="text-muted-foreground text-xs underline underline-offset-4"
        onClick={() => setShowTerms((v) => !v)}
      >
        {showTerms ? "Hide the ideas" : "Show the ideas from Learn first"}
      </button>
      {showTerms ? <ConceptList concepts={exercise.concepts} /> : null}
    </div>
  ) : null;

  return (
    <ExerciseShell stepIndex={phase} stepLabels={practiceStepLabels("Think it through")} partLabel={partLabel}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? (
        <ExerciseStepCard
          data-testid="judgment-setup"
          title="Life situations"
          description="Read a real-life situation through three lenses, then choose how to respond."
        >
          <LevelPicker
            value={level}
            onChange={chooseLevel}
            descriptions={{
              guided: JUDGMENT_LEVELS.guided.description,
              standard: JUDGMENT_LEVELS.standard.description,
              expert: JUDGMENT_LEVELS.expert.description,
            }}
            note={`Takes ${setupLevel.minutes}.`}
          />
          <div className="grid gap-2">
            <Label>Area of life</Label>
            <div className="flex flex-wrap gap-2" data-testid="life-areas">
              {LIFE_AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={area === a}
                  onClick={() => setArea(a)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    area === a ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <Input
              aria-label="Other area"
              placeholder="Or type another area"
              value={(LIFE_AREAS as readonly string[]).includes(area) ? "" : area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Setting</Label>
            <div className="flex gap-2">
              {(["vietnam", "general"] as const).map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={context === c ? "default" : "outline"}
                  aria-pressed={context === c}
                  onClick={() => setContext(c)}
                >
                  {c === "vietnam" ? "Vietnam" : "General"}
                </Button>
              ))}
            </div>
          </div>
          {setupLevel.ownSituation ? (
            <div className="grid gap-2">
              <Label>Situation</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={source === "generated" ? "default" : "outline"}
                  onClick={() => setSource("generated")}
                >
                  A new situation
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={source === "custom_scenario" ? "default" : "outline"}
                  onClick={() => setSource("custom_scenario")}
                >
                  My situation
                </Button>
              </div>
              {source === "custom_scenario" ? (
                <>
                  <Textarea
                    aria-label="My situation"
                    rows={4}
                    value={ownSituation}
                    onChange={(e) => setOwnSituation(e.target.value)}
                    placeholder="What happened, who was involved, and what you have to decide."
                  />
                  <p className="text-muted-foreground text-xs">
                    This is private: it is saved with your exercises. Leave out real names.
                  </p>
                </>
              ) : null}
            </div>
          ) : null}
          <div>
            <Button type="button" disabled={loading} onClick={() => void generate()}>
              {loading ? (
                <>
                  <InlineSpinner /> Generating…
                </>
              ) : (
                "Generate exercise"
              )}
            </Button>
          </div>
        </ExerciseStepCard>
      ) : null}

      {step === 1 && exercise ? (
        <ExerciseStepCard
          data-testid="judgment-exercise-card"
          title={exercise.title}
          description={
            <>
              {exercise.domain}
              <span className={EXERCISE_STEP_META_BADGE}>{LEVEL_LABELS[exercise.level]}</span>
            </>
          }
          bodyClassName="space-y-5"
        >
          {part === "learn" ? (
            <LearnFirst
              concepts={exercise.concepts}
              checks={exercise.conceptChecks}
              answers={exercise.conceptAnswers ?? []}
              seed={exercise.id}
              onAnswer={(ci, oi) => {
                const answers = [...(exercise.conceptAnswers ?? [])];
                answers[ci] = oi;
                save({ conceptAnswers: answers });
              }}
              onDone={() => save({ part: "lenses" })}
            />
          ) : null}

          {part === "lenses" ? (
            <>
              {scenarioBlock}
              <p className="text-sm font-medium text-zinc-900">Look at it through three lenses.</p>
              {cfg.lensMode === "one-by-one"
                ? (() => {
                    const q = exercise.lensQuestions[Math.min(lensIndex, exercise.lensQuestions.length - 1)]!;
                    const picked = lensAnswers[q.lens];
                    return (
                      <div className="space-y-3" data-testid="lens-question">
                        <p className="text-muted-foreground text-xs">
                          Lens {Math.min(lensIndex, 2) + 1} of 3 · {LENS_INFO[q.lens].name}
                        </p>
                        <p className="text-sm font-medium text-zinc-900">{q.question}</p>
                        <ChoiceButtons
                          options={q.options}
                          order={lensOrders[q.lens] ?? [0, 1, 2]}
                          picked={picked}
                          answer={q.answerIndex}
                          reveal
                          label={q.question}
                          onPick={(oi) => save({ lensAnswers: { ...lensAnswers, [q.lens]: oi } })}
                        />
                        {picked != null ? (
                          <>
                            <p className="text-sm">{q.explanation}</p>
                            <Button
                              type="button"
                              onClick={() => {
                                if (lensIndex < exercise.lensQuestions.length - 1) setLensIndex(lensIndex + 1);
                                else save({ part: "respond" });
                              }}
                            >
                              {lensIndex < exercise.lensQuestions.length - 1 ? "Next lens" : "Choose a response"}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    );
                  })()
                : (
                  <div className="space-y-5">
                    {exercise.lensQuestions.map((q) => (
                      <div key={q.lens} className="space-y-2" data-testid="lens-question">
                        <p className="text-muted-foreground text-xs">{LENS_INFO[q.lens].name}</p>
                        <p className="text-sm font-medium text-zinc-900">{q.question}</p>
                        {cfg.lensMode === "free" ? (
                          <Textarea
                            aria-label={`${LENS_INFO[q.lens].name}: ${q.question}`}
                            rows={2}
                            value={lensText[q.lens] ?? ""}
                            onChange={(e) => save({ lensText: { ...lensText, [q.lens]: e.target.value } })}
                          />
                        ) : (
                          <ChoiceButtons
                            options={q.options}
                            order={lensOrders[q.lens] ?? [0, 1, 2]}
                            picked={lensAnswers[q.lens]}
                            answer={q.answerIndex}
                            reveal={false}
                            label={q.question}
                            onPick={(oi) => save({ lensAnswers: { ...lensAnswers, [q.lens]: oi } })}
                          />
                        )}
                      </div>
                    ))}
                    <Button type="button" disabled={!lensesDone} onClick={() => save({ part: "respond" })}>
                      Choose a response
                    </Button>
                  </div>
                )}
            </>
          ) : null}

          {part === "respond" ? (
            <>
              {scenarioBlock}
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900">
                  Put the ways to respond in order: best at the top.
                </p>
                <RankList
                  items={exercise.responses}
                  order={exercise.userOrder ?? exercise.responses.map((r) => r.id)}
                  onChange={(order) => save({ userOrder: order })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="judgment-why">Why is your first choice the best? (one or two sentences)</Label>
                <Textarea
                  id="judgment-why"
                  rows={2}
                  value={exercise.userWhy ?? ""}
                  onChange={(e) => save({ userWhy: e.target.value })}
                  placeholder={cfg.lensMode === "one-by-one" ? "Optional at this level." : undefined}
                />
              </div>
              {cfg.ownResponse ? (
                <div className="grid gap-2">
                  <Label htmlFor="judgment-own">What would you actually do or say? (optional)</Label>
                  <Textarea
                    id="judgment-own"
                    rows={3}
                    value={exercise.ownResponse ?? ""}
                    onChange={(e) => save({ ownResponse: e.target.value })}
                  />
                </div>
              ) : null}
              <ConfidenceSlider
                value={confidence}
                onChange={setConfidence}
                label="How sure are you about your order?"
              />
              {loading ? <PerspectiveLoadingCard /> : null}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={loading} onClick={() => save({ part: "lenses" })}>
                  Back
                </Button>
                <Button type="button" disabled={loading} onClick={() => void getFeedback()}>
                  {loading ? "Loading…" : "Get AI feedback"}
                </Button>
              </div>
            </>
          ) : null}
        </ExerciseStepCard>
      ) : null}

      {(step === FEEDBACK_STEP || step === 7) && exercise?.result ? (
        <div className="space-y-4">
          <JudgmentAnswerKey
            exercise={exercise}
            result={exercise.result}
            coaching={isCoachingStructured(perspectiveStructured) ? perspectiveStructured : null}
          />
          {step === 7 && levelSuggestion ? (
            <LevelSuggestionCard
              suggestion={levelSuggestion}
              onAccept={() => {
                chooseLevel(levelSuggestion.to);
                showToast(`Level set to ${LEVEL_LABELS[levelSuggestion.to]} for your next exercise.`);
                setLevelSuggestion(null);
              }}
              onDismiss={() => {
                void dismissLevelSuggestion("judgment");
                setLevelSuggestion(null);
              }}
            />
          ) : null}
          <PracticeFinishCard
            takeaway={takeaway}
            onTakeawayChange={setTakeaway}
            onFinish={finish}
            saving={finishing}
            finished={step === 7}
            takeawayPlaceholder="What will you do differently in a real situation like this?"
          />
        </div>
      ) : null}
    </ExerciseShell>
  );
}

