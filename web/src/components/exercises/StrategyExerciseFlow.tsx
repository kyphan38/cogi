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
import { OutcomeStories, PayoffMatrix, outcomeNumbers } from "@/components/exercises/PayoffMatrix";
import { StrategyAnswerKey } from "@/components/exercises/StrategyAnswerKey";
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
import { isStrategyExercise, type StrategyExerciseRow } from "@/lib/types/exercise";
import { isCoachingStructured, type AIPerspectiveStructured } from "@/lib/types/perspective";
import type { StrategyExercisePayload } from "@/lib/ai/validators/strategy";
import { STRATEGY_AREAS, STRATEGY_LEVELS } from "@/lib/exercise/strategy-levels";
import { analyzeGame, cellKey } from "@/lib/exercise/game";
import { scoreStrategy, type StrategyAnswers } from "@/lib/exercise/strategy-score";
import { seededHash } from "@/lib/exercise/guided-candidates";
import { DEFAULT_PRACTICE_LEVEL, LEVEL_LABELS, type LevelSuggestion, type PracticeLevel } from "@/lib/exercise/levels";
import { levelSuggestionFor } from "@/lib/exercise/level-suggestion";
import { useSaveOnLeave } from "@/lib/hooks/useSaveOnLeave";
import { GEO_GAME_CASES, geoGameCaseById } from "@/lib/geo/game-cases";

type FlowStep = 0 | 1 | 4 | 7;
const FEEDBACK_STEP = 4;

const PART_LABELS = {
  learn: "Part 1 of 3 · Learn first",
  analyze: "Part 2 of 3 · Read the game",
  predict: "Part 3 of 3 · Predict the outcome",
} as const;

/** Stable shuffle of keys by exercise id, so ranking does not start in the answer order. */
function shuffled(keys: string[], seed: string): string[] {
  return keys
    .map((k, i) => ({ k, h: seededHash(seed, i) }))
    .sort((x, y) => x.h - y.h)
    .map((x) => x.k);
}

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

/** Strategic situations: game theory in real stories (PLAN-learning.md L2). */
export function StrategyExerciseFlow({
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
  const initialCase = geoGameCaseById(initialDomain?.trim());
  const [area, setArea] = useState(initialCase ? "" : initialDomain?.trim() || "Business & prices");
  /** Geopolitical games (PLAN-geopolitics.md G3): a real case to base the story on. */
  const [geoCaseId, setGeoCaseId] = useState<string | null>(initialCase?.id ?? null);
  const pickedCase = geoGameCaseById(geoCaseId);
  const [exercise, setExercise] = useState<StrategyExerciseRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(50);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [rankPlayer, setRankPlayer] = useState<"A" | "B">("A");
  const [showTerms, setShowTerms] = useState(false);
  const [perspectiveStructured, setPerspectiveStructured] = useState<AIPerspectiveStructured | null>(null);
  const [takeaway, setTakeaway] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion>(null);
  const pendingSave = useSaveOnLeave();

  const setupLevel = STRATEGY_LEVELS[level];
  const cfg = exercise ? STRATEGY_LEVELS[exercise.level] : setupLevel;

  useEffect(() => {
    void getPracticeLevel("strategy").then(setLevel);
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    void (async () => {
      const row = await getExercise(resumeId);
      if (!row || row.completedAt || !isStrategyExercise(row)) return;
      setExercise(row);
      setConfidence(row.confidenceBefore ?? 50);
      setTakeaway(row.takeaway ?? "");
      if (row.aiPerspectiveStructured) setPerspectiveStructured(row.aiPerspectiveStructured);
      setStep(row.aiPerspective ? FEEDBACK_STEP : 1);
    })();
  }, [resumeId]);

  /** Update the row; the effect below saves it a second after the last change. */
  const save = (patch: Partial<StrategyExerciseRow>) => setExercise((prev) => (prev ? { ...prev, ...patch } : prev));
  const saveAnswers = (patch: Partial<StrategyAnswers>) =>
    setExercise((prev) =>
      prev ? { ...prev, answers: { prediction: [], ...prev.answers, ...patch } as StrategyAnswers } : prev,
    );

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
    void setPracticeLevel("strategy", next);
  };

  const generate = async () => {
    setError(null);
    const gameCase = pickedCase;
    if (!gameCase && !area.trim()) {
      setError("Pick a topic area.");
      return;
    }
    setLoading(true);
    try {
      const [userContext, languageLevel] = await Promise.all([getUserContext(), getLanguageLevelForRequest()]);
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: "strategy",
          domain: gameCase ? gameCase.title : area.trim(),
          ...(gameCase ? { geoCaseId: gameCase.id } : {}),
          level,
          userContext: userContext || undefined,
          languageLevel,
        }),
      });
      const json = await safeAiJson<{ ok: true; data: StrategyExercisePayload } | { ok: false; error: string }>(res);
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const d = json.data;
      const id = crypto.randomUUID();
      const keys = d.optionsA.flatMap((a) => d.optionsB.map((b) => cellKey(a.id, b.id)));
      const cfgNow = STRATEGY_LEVELS[level];
      const row: StrategyExerciseRow = {
        id,
        type: "strategy",
        domain: gameCase ? gameCase.title : area.trim(),
        ...(gameCase ? { geoCaseId: gameCase.id } : {}),
        title: d.title,
        scenario: d.scenario,
        concepts: d.concepts,
        conceptChecks: d.conceptChecks,
        players: d.players,
        optionsA: d.optionsA,
        optionsB: d.optionsB,
        cells: d.cells,
        gameType: d.gameType,
        insight: d.insight,
        level,
        part: "learn",
        conceptAnswers: [],
        answers: cfgNow.showPayoffs
          ? { bestReplies: {}, prediction: [] }
          : {
              ranks: { A: shuffled(keys, `${id}-A`), B: shuffled(keys, `${id}-B`) },
              prediction: [],
              ...(cfgNow.extraQuestions ? { dominant: { A: "", B: "" }, betterForBoth: [] } : {}),
            },
        userWhy: "",
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 1,
      };
      await putExercise(row);
      setExercise(row);
      setQuestionIndex(0);
      setRankPlayer("A");
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
    if (!exercise?.answers) return;
    setError(null);
    if (exercise.answers.prediction.length === 0) {
      setError("Pick the outcome (or outcomes) where you think they end up.");
      return;
    }
    if (exercise.answers.dominant && (!exercise.answers.dominant.A || !exercise.answers.dominant.B)) {
      setError("Answer the dominant choice question for both sides.");
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: StrategyExerciseRow = { ...exercise, confidenceBefore: confidence };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "strategy", exercise: row, userContext: userContext || undefined }),
      });
      const parsed = parsePerspectiveFetchJson(await safeAiJson<unknown>(res), "analytical");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const result = scoreStrategy({
        aOptions: row.optionsA.map((o) => o.id),
        bOptions: row.optionsB.map((o) => o.id),
        cells: row.cells,
        answers: row.answers!,
      });
      const next: StrategyExerciseRow = {
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
      const saved = (await completePracticeExercise({ exercise, takeaway })) as StrategyExerciseRow;
      setExercise(saved);
      setStep(7);
      void levelSuggestionFor("strategy", saved.level)
        .then(setLevelSuggestion)
        .catch(() => setLevelSuggestion(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFinishing(false);
    }
  };

  const facts = useMemo(
    () =>
      exercise ? analyzeGame(exercise.optionsA.map((o) => o.id), exercise.optionsB.map((o) => o.id), exercise.cells) : null,
    [exercise],
  );
  const A = exercise?.players.find((p) => p.id === "A");
  const B = exercise?.players.find((p) => p.id === "B");
  /** Guided best-reply questions: A against each B choice, then B against each A choice. */
  const questions = useMemo(
    () =>
      exercise
        ? [
            ...exercise.optionsB.map((b) => ({ key: `A:${b.id}`, player: "A" as const, opp: b.id })),
            ...exercise.optionsA.map((a) => ({ key: `B:${a.id}`, player: "B" as const, opp: a.id })),
          ]
        : [],
    [exercise],
  );

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;
  const answers = exercise?.answers;
  const numbers = exercise ? outcomeNumbers(exercise) : new Map<string, number>();

  const storyBlock = exercise && A && B ? (
    <div className="space-y-2">
      {exercise.geoCaseId ? (
        <p className="text-muted-foreground text-xs" data-testid="geo-scenario-label">
          Scenario: a made-up story shaped like a real case. The real case comes at the end.
        </p>
      ) : null}
      <div className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900">
        {exercise.scenario}
      </div>
      <p className="text-sm text-zinc-700">
        <span className="font-medium">{A.name}</span> wants: {A.goal} <span className="font-medium">{B.name}</span> wants:{" "}
        {B.goal}
      </p>
      <button
        type="button"
        className="text-muted-foreground text-xs underline underline-offset-4"
        onClick={() => setShowTerms((v) => !v)}
      >
        {showTerms ? "Hide the terms" : "Show the terms from Learn first"}
      </button>
      {showTerms ? <ConceptList concepts={exercise.concepts} /> : null}
    </div>
  ) : null;

  return (
    <ExerciseShell stepIndex={phase} stepLabels={practiceStepLabels("Read the game")} partLabel={partLabel}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? (
        <ExerciseStepCard
          data-testid="strategy-setup"
          title="Strategic situations"
          description="Game theory in real stories: what each side wants, the best reply, and where they end up."
        >
          <LevelPicker
            value={level}
            onChange={chooseLevel}
            descriptions={{
              guided: STRATEGY_LEVELS.guided.description,
              standard: STRATEGY_LEVELS.standard.description,
              expert: STRATEGY_LEVELS.expert.description,
            }}
            note={`Takes ${setupLevel.minutes}.`}
          />
          <div className="grid gap-2">
            <Label>Topic</Label>
            <div className="flex flex-wrap gap-2" data-testid="strategy-areas">
              {STRATEGY_AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={!pickedCase && area === a}
                  onClick={() => {
                    setArea(a);
                    setGeoCaseId(null);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    !pickedCase && area === a ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <Input
              aria-label="Other topic"
              placeholder="Or type another topic"
              value={(STRATEGY_AREAS as readonly string[]).includes(area) ? "" : area}
              onChange={(e) => {
                setArea(e.target.value);
                setGeoCaseId(null);
              }}
            />
          </div>
          <div className="grid gap-2" data-testid="geo-cases">
            <Label>Or start from a real case (geopolitics)</Label>
            <p className="text-muted-foreground text-xs">
              You play a made-up story with the same game. At the end you see what really happened, with sources.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GEO_GAME_CASES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={geoCaseId === c.id}
                  onClick={() => setGeoCaseId(geoCaseId === c.id ? null : c.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm",
                    geoCaseId === c.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
                  )}
                  data-testid={`geo-case-${c.id}`}
                >
                  <span className="block font-medium">{c.title}</span>
                  <span className={cn("block text-xs", geoCaseId === c.id ? "text-zinc-300" : "text-muted-foreground")}>{c.when}</span>
                </button>
              ))}
            </div>
            {pickedCase ? (
              <div className="space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm" data-testid="geo-case-summary">
                <p className="leading-relaxed">{pickedCase.summary}</p>
                <p className="text-muted-foreground text-xs">Real cases use 2 choices for each side at every level.</p>
              </div>
            ) : null}
          </div>
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

      {step === 1 && exercise && A && B && answers && facts ? (
        <ExerciseStepCard
          data-testid="strategy-exercise-card"
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
                const next = [...(exercise.conceptAnswers ?? [])];
                next[ci] = oi;
                save({ conceptAnswers: next });
              }}
              onDone={() => save({ part: "analyze" })}
            />
          ) : null}

          {part === "analyze" ? (
            <>
              {storyBlock}
              {cfg.showPayoffs ? (
                (() => {
                  const q = questions[Math.min(questionIndex, questions.length - 1)]!;
                  const isA = q.player === "A";
                  const me = isA ? A : B;
                  const choices = isA ? exercise.optionsA : exercise.optionsB;
                  const given = answers.bestReplies?.[q.key];
                  const best = isA ? facts.bestA[q.opp]! : facts.bestB[q.opp]!;
                  const oppLabel = isA
                    ? `${B.name} picks "${exercise.optionsB.find((o) => o.id === q.opp)?.label}"`
                    : `${A.name} picks "${exercise.optionsA.find((o) => o.id === q.opp)?.label}"`;
                  const payoff = (choice: string) => {
                    const c = exercise.cells.find((x) => (isA ? x.a === choice && x.b === q.opp : x.a === q.opp && x.b === choice))!;
                    return isA ? c.payoffA : c.payoffB;
                  };
                  return (
                    <div className="space-y-3" data-testid="best-reply-question">
                      <PayoffMatrix game={exercise} showPayoffs />
                      <p className="text-muted-foreground text-xs">
                        Question {questionIndex + 1} of {questions.length} · best reply
                      </p>
                      <p className="text-sm font-medium text-zinc-900">
                        If {oppLabel}, what is the best reply for {me.name}?
                      </p>
                      <div className="grid gap-2" role="radiogroup" aria-label="Best reply">
                        {choices.map((c) => {
                          const picked = given === c.id;
                          const showRight = given != null && c.id === best;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              role="radio"
                              aria-checked={picked}
                              disabled={given != null}
                              onClick={() => saveAnswers({ bestReplies: { ...answers.bestReplies, [q.key]: c.id } })}
                              className={cn(
                                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm disabled:cursor-default",
                                showRight ? "border-zinc-900 bg-zinc-50" : picked ? "border-zinc-400" : "border-zinc-200 hover:bg-zinc-50",
                              )}
                            >
                              {showRight ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                              {picked && !showRight ? <X className="size-4 shrink-0" aria-hidden /> : null}
                              <span>{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {given != null ? (
                        <>
                          <p className="text-sm" data-testid="best-reply-feedback">
                            <span className="font-medium">{given === best ? "Right. " : "Not quite. "}</span>
                            {`${me.name} gets ${choices.map((c) => `${payoff(c.id)} with "${c.label}"`).join(" and ")}, so the best reply is "${choices.find((c) => c.id === best)?.label}".`}
                          </p>
                          <Button
                            type="button"
                            onClick={() => {
                              if (questionIndex < questions.length - 1) setQuestionIndex(questionIndex + 1);
                              else save({ part: "predict" });
                            }}
                          >
                            {questionIndex < questions.length - 1 ? "Next question" : "Predict the outcome"}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-3" data-testid="rank-outcomes">
                  <OutcomeStories game={exercise} />
                  <p className="text-sm font-medium text-zinc-900">
                    {rankPlayer === "A" ? "1 of 2" : "2 of 2"} · How good is each outcome for{" "}
                    {rankPlayer === "A" ? A.name : B.name}? Best at the top.
                  </p>
                  <RankList
                    items={exercise.cells.map((c) => {
                      const key = cellKey(c.a, c.b);
                      return { id: key, text: `Outcome ${numbers.get(key)}: ${c.story}` };
                    })}
                    order={answers.ranks?.[rankPlayer] ?? []}
                    onChange={(order) =>
                      saveAnswers({ ranks: { ...answers.ranks!, [rankPlayer]: order } })
                    }
                  />
                  <div className="flex gap-2">
                    {rankPlayer === "B" ? (
                      <Button type="button" variant="secondary" onClick={() => setRankPlayer("A")}>
                        Back
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      onClick={() => {
                        if (rankPlayer === "A") setRankPlayer("B");
                        else save({ part: "predict" });
                      }}
                    >
                      {rankPlayer === "A" ? `Next: ${B.name}` : "Predict the outcome"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {part === "predict" ? (
            <>
              {storyBlock}
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900">
                  Where do they end up? Pick the outcome where neither side wants to change (pick two if you see two).
                </p>
                <PayoffMatrix
                  game={exercise}
                  showPayoffs={cfg.showPayoffs}
                  selected={answers.prediction}
                  onToggle={(key) => saveAnswers({ prediction: toggle(answers.prediction, key) })}
                  testId="prediction-matrix"
                />
                {!cfg.showPayoffs ? <OutcomeStories game={exercise} /> : null}
              </div>

              {cfg.extraQuestions && answers.dominant ? (
                <div className="space-y-4">
                  {(["A", "B"] as const).map((p) => {
                    const who = p === "A" ? A : B;
                    const opts = p === "A" ? exercise.optionsA : exercise.optionsB;
                    return (
                      <div key={p} className="space-y-2" data-testid="dominant-question">
                        <p className="text-sm font-medium text-zinc-900">
                          Does {who.name} have a choice that is best whatever the other side does?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[...opts.map((o) => ({ id: o.id, label: o.label })), { id: "none", label: "No such choice" }].map((o) => (
                            <Button
                              key={o.id}
                              type="button"
                              size="sm"
                              variant={answers.dominant![p] === o.id ? "default" : "outline"}
                              aria-pressed={answers.dominant![p] === o.id}
                              onClick={() => saveAnswers({ dominant: { ...answers.dominant!, [p]: o.id } })}
                            >
                              {o.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="space-y-2" data-testid="better-question">
                    <p className="text-sm font-medium text-zinc-900">
                      Is there an outcome that would be better for BOTH than where they end up? Pick it, or leave none
                      picked.
                    </p>
                    <PayoffMatrix
                      game={exercise}
                      showPayoffs={false}
                      selected={answers.betterForBoth}
                      onToggle={(key) => saveAnswers({ betterForBoth: toggle(answers.betterForBoth ?? [], key) })}
                      testId="better-matrix"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="strategy-why">Why do they end up there? (one or two sentences)</Label>
                <Textarea
                  id="strategy-why"
                  rows={2}
                  value={exercise.userWhy ?? ""}
                  onChange={(e) => save({ userWhy: e.target.value })}
                />
              </div>
              <ConfidenceSlider value={confidence} onChange={setConfidence} label="How sure are you about the outcome?" />
              {loading ? <PerspectiveLoadingCard /> : null}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={loading} onClick={() => save({ part: "analyze" })}>
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
          <StrategyAnswerKey
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
                void dismissLevelSuggestion("strategy");
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
            takeawayPlaceholder="Where in your life do you see a game like this?"
          />
        </div>
      ) : null}
    </ExerciseShell>
  );
}
