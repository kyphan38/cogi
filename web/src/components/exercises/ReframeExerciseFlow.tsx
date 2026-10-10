"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { ExerciseShell, practicePhase, practiceStepLabels } from "@/components/shared/ExerciseShell";
import { ExerciseStepCard, EXERCISE_STEP_META_BADGE } from "@/components/shared/ExerciseStepCard";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { PracticeFinishCard } from "@/components/shared/PracticeFinishCard";
import { LevelSuggestionCard } from "@/components/shared/LevelSuggestionCard";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { ConceptList, LearnFirst } from "@/components/exercises/LearnFirst";
import { ReframeAnswerKey } from "@/components/exercises/ReframeAnswerKey";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import { getExercise, putExercise } from "@/lib/db/exercises";
import { rememberExerciseInUrl } from "@/lib/nav/exercise-url";
import { completePracticeExercise } from "@/lib/db/complete-exercise";
import {
  dismissLevelSuggestion,
  getLanguageLevelForRequest,
  getPracticeLevel,
  getUserContext,
  setPracticeLevel,
} from "@/lib/db/settings";
import { isReframeExercise, type ReframeExerciseRow } from "@/lib/types/exercise";
import { useSaveOnLeave } from "@/lib/hooks/useSaveOnLeave";
import { takeScenarioText } from "@/lib/topics/scenario-handoff";
import { isCoachingStructured, type AIPerspectiveStructured } from "@/lib/types/perspective";
import type { ReframeAnswer, ReframeExercisePayload, ReframeThought } from "@/lib/ai/validators/reframe";
import type { JudgmentContext } from "@/lib/exercise/judgment-levels";
import {
  answerName,
  FEELING_WORDS,
  REALISTIC_INFO,
  REFRAME_AREAS,
  REFRAME_LEVELS,
  REFRAME_TAG_INFO,
  type ReframeLevelConfig,
} from "@/lib/exercise/reframe-levels";
import { REFRAME_SUPPORT_MESSAGE } from "@/lib/exercise/reframe-safety";
import { scoreReframe } from "@/lib/exercise/reframe-score";
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
  spot: "Part 2 of 3 · Spot the traps",
  reframe: "Part 3 of 3 · Reframe",
} as const;

/** Answers the user can give at a level: its traps, then "Realistic". */
function answerOptions(cfg: ReframeLevelConfig): ReframeAnswer[] {
  return [...cfg.tags, "realistic"];
}

/**
 * The monologue level leaves fair thoughts untouched (like Analytical Expert), so an
 * unmarked thought counts as "realistic" there.
 */
function answersForScoring(ex: ReframeExerciseRow): Partial<Record<string, ReframeAnswer>> {
  const answers = { ...(ex.answers ?? {}) };
  if (REFRAME_LEVELS[ex.level].layout === "monologue") {
    for (const t of ex.thoughts) answers[t.id] ??= "realistic";
  }
  return answers;
}

function TrapPicker({
  options,
  picked,
  onPick,
  disabled,
  label,
  showQuestions,
}: {
  options: ReframeAnswer[];
  picked: ReframeAnswer | undefined;
  onPick: (a: ReframeAnswer) => void;
  disabled?: boolean;
  label: string;
  showQuestions: boolean;
}) {
  return (
    <div className={cn("grid gap-2", showQuestions ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3")} role="radiogroup" aria-label={label}>
      {options.map((a) => {
        const info = a === "realistic" ? REALISTIC_INFO : REFRAME_TAG_INFO[a];
        const isPicked = picked === a;
        return (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={isPicked}
            disabled={disabled}
            onClick={() => onPick(a)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left text-sm disabled:cursor-default",
              isPicked ? "border-zinc-900 bg-zinc-50 font-medium" : "border-zinc-200 hover:bg-zinc-50",
              a === "realistic" && !isPicked ? "border-dashed" : null,
            )}
          >
            <span className="block">{info.name}</span>
            {showQuestions ? <span className="text-muted-foreground block text-xs font-normal">{info.question}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function TrapGuide({ options }: { options: ReframeAnswer[] }) {
  return (
    <details className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" data-testid="trap-guide">
      <summary className="cursor-pointer font-medium">Trap guide: the question behind each name</summary>
      <ul className="mt-2 space-y-1">
        {options.map((a) => {
          const info = a === "realistic" ? REALISTIC_INFO : REFRAME_TAG_INFO[a];
          return (
            <li key={a}>
              <span className="font-medium">{info.name}: </span>
              <span className="text-muted-foreground">{info.question}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function FeelingSlider({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid max-w-md gap-3">
      <Label htmlFor={id}>
        {label} ({value}/100)
      </Label>
      <Slider
        id={id}
        thumbLabel={label}
        min={0}
        max={100}
        step={5}
        value={[value]}
        onValueChange={(v) => {
          const n = Array.isArray(v) ? v[0] : v;
          onChange(typeof n === "number" ? n : 0);
        }}
      />
    </div>
  );
}

/** Reframe: spot thinking traps, then rewrite one thought (PLAN-psychology.md P1). */
export function ReframeExerciseFlow({
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
  const [exercise, setExercise] = useState<ReframeExerciseRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSupport, setNeedsSupport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(50);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [perspectiveStructured, setPerspectiveStructured] = useState<AIPerspectiveStructured | null>(null);
  const [takeaway, setTakeaway] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion>(null);

  const handedScenario = useRef<string | null | undefined>(undefined);
  const setupLevel = REFRAME_LEVELS[level];
  const cfg = exercise ? REFRAME_LEVELS[exercise.level] : setupLevel;
  const options = answerOptions(cfg);

  useEffect(() => {
    // A scenario from the New exercise page needs a level with "My situation" (PLAN-topic-ideas.md T2).
    // Read once: in dev, React runs this effect twice and the text is cleared on read.
    if (handedScenario.current === undefined) handedScenario.current = resumeId ? null : takeScenarioText();
    const handed = handedScenario.current;
    void getPracticeLevel("reframe").then((saved) => {
      if (!handed) {
        setLevel(saved);
        return;
      }
      setLevel(REFRAME_LEVELS[saved].ownSituation ? saved : "standard");
      setSource("custom_scenario");
      setOwnSituation(handed);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!resumeId) return;
    void (async () => {
      const row = await getExercise(resumeId);
      if (!row || row.completedAt || !isReframeExercise(row)) return;
      setExercise(row);
      setConfidence(row.confidenceBefore ?? 50);
      setTakeaway(row.takeaway ?? "");
      if (row.aiPerspectiveStructured) setPerspectiveStructured(row.aiPerspectiveStructured);
      // Guided: resume at the first thought not answered yet.
      const next = row.thoughts.findIndex((t) => row.answers?.[t.id] == null);
      setThoughtIndex(next >= 0 ? next : Math.max(0, row.thoughts.length - 1));
      setStep(row.aiPerspective ? FEEDBACK_STEP : 1);
    })();
  }, [resumeId]);

  const pendingSave = useSaveOnLeave();
  /** Update the row; the effect below saves it a second after the last change. */
  const save = (patch: Partial<ReframeExerciseRow>) => {
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
    void setPracticeLevel("reframe", next);
    if (!REFRAME_LEVELS[next].ownSituation) setSource("generated");
  };

  const generate = async () => {
    setError(null);
    setNeedsSupport(false);
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
          exerciseType: "reframe",
          domain: area.trim(),
          context,
          level,
          mode: source,
          customScenario: source === "custom_scenario" ? ownSituation.trim() : undefined,
          userContext: userContext || undefined,
          languageLevel,
        }),
      });
      const json = await safeAiJson<
        { ok: true; data: ReframeExercisePayload } | { ok: false; error: string; safety?: "concern" }
      >(res);
      if (!json.ok) {
        if (json.safety === "concern") setNeedsSupport(true);
        else setError(json.error);
        return;
      }
      const data = json.data;
      const row: ReframeExerciseRow = {
        id: crypto.randomUUID(),
        type: "reframe",
        domain: area.trim(),
        context,
        customScenario: source === "custom_scenario" ? ownSituation.trim() : undefined,
        title: data.title,
        scenario: data.scenario,
        concepts: data.concepts,
        conceptChecks: data.conceptChecks,
        thoughts: data.thoughts,
        rewrite: data.rewrite,
        level,
        part: "learn",
        conceptAnswers: [],
        intensityBefore: 50,
        intensityAfter: 50,
        answers: {},
        rewriteChoice: null,
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 1,
      };
      await putExercise(row);
      rememberExerciseInUrl(row);
      setExercise(row);
      setThoughtIndex(0);
      setSelectedThought(null);
      setPerspectiveStructured(null);
      setTakeaway("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  };

  const rewriteMissing = (ex: ReframeExerciseRow): string | null => {
    if (cfg.rewrite === "choose") return ex.rewriteChoice == null ? "Pick the most balanced thought." : null;
    if (cfg.rewrite === "evidence" && (!ex.evidenceFor?.trim() || !ex.evidenceAgainst?.trim())) {
      return "Write the evidence for and against the thought.";
    }
    return (ex.balancedThought?.trim().length ?? 0) < 10 ? "Write your balanced thought (a full sentence)." : null;
  };

  const getFeedback = async () => {
    if (!exercise) return;
    setError(null);
    const missing = rewriteMissing(exercise);
    if (missing) {
      setError(missing);
      return;
    }
    setLoading(true);
    pendingSave.clear();
    try {
      const row: ReframeExerciseRow = { ...exercise, answers: answersForScoring(exercise), confidenceBefore: confidence };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "reframe", exercise: row, userContext: userContext || undefined }),
      });
      const parsed = parsePerspectiveFetchJson(await safeAiJson<unknown>(res), "analytical");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const result = scoreReframe({
        thoughts: row.thoughts,
        answers: row.answers ?? {},
        rewrite: row.rewrite,
        rewriteChoice: row.rewriteChoice,
        rewriteWritten: cfg.rewrite !== "choose",
      });
      const next: ReframeExerciseRow = {
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
      const saved = (await completePracticeExercise({ exercise, takeaway })) as ReframeExerciseRow;
      setExercise(saved);
      setStep(7);
      void levelSuggestionFor("reframe", saved.level)
        .then(setLevelSuggestion)
        .catch(() => setLevelSuggestion(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFinishing(false);
    }
  };

  const rewriteOrder = useMemo(
    () => (exercise ? shuffledOrder(exercise.rewrite.options.length, `${exercise.id}-rewrite`) : []),
    [exercise],
  );

  const phase = practicePhase(step, FEEDBACK_STEP);
  const part = exercise?.part ?? "learn";
  const partLabel = phase === 1 ? PART_LABELS[part] : undefined;
  const answers = exercise?.answers ?? {};
  const setAnswer = (id: string, a: ReframeAnswer) => save({ answers: { ...answers, [id]: a } });
  const thoughtsDone =
    exercise != null && (cfg.layout === "monologue" || exercise.thoughts.every((t) => answers[t.id] != null));
  const target = exercise?.thoughts.find((t) => t.id === exercise.rewrite.thoughtId);
  const trapCount = exercise?.thoughts.filter((t) => t.trap !== "realistic").length ?? 0;

  const countHint =
    !exercise || cfg.countHint === null
      ? "Mark only the thoughts you think are traps. Some, or even most, may be fair."
      : cfg.countHint === "traps"
        ? `${trapCount} of these ${exercise.thoughts.length} thoughts are traps.`
        : `${trapCount} of these thoughts are traps and ${exercise.thoughts.length - trapCount} is realistic.`;

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

  const feelingBlock = exercise ? (
    <div className="space-y-3" data-testid="feeling-step">
      <p className="text-sm font-medium text-zinc-900">First, name the main feeling. Be specific.</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Main feeling">
        {FEELING_WORDS.map((w) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={exercise.feeling === w}
            onClick={() => save({ feeling: w })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              exercise.feeling === w ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
            )}
          >
            {w}
          </button>
        ))}
      </div>
      <FeelingSlider
        id="intensity-before"
        label="How strong is it?"
        value={exercise.intensityBefore ?? 50}
        onChange={(v) => save({ intensityBefore: v })}
      />
    </div>
  ) : null;

  /** Guided: one thought per screen; the first pick is kept and the answer shown. */
  const oneByOne = (ex: ReframeExerciseRow) => {
    const i = Math.min(thoughtIndex, ex.thoughts.length - 1);
    const t = ex.thoughts[i]!;
    const picked = answers[t.id];
    const right =
      picked != null && (picked === t.trap || (picked !== "realistic" && t.alsoAccepted.includes(picked)));
    return (
      <div className="space-y-3" data-testid="thought-question">
        <p className="text-muted-foreground text-xs">
          Thought {i + 1} of {ex.thoughts.length}
        </p>
        <blockquote className="border-l-2 border-zinc-900 pl-3 text-base italic text-zinc-900">{t.text}</blockquote>
        <TrapPicker
          options={options}
          picked={picked}
          onPick={(a) => setAnswer(t.id, a)}
          disabled={picked != null}
          label={`Which trap is in: ${t.text}`}
          showQuestions
        />
        {picked != null ? (
          <>
            <p className="flex items-start gap-2 text-sm" data-testid="thought-feedback">
              {right ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0" aria-hidden />}
              <span>
                <span className="font-medium">{right ? "Right. " : `Not quite: it is ${answerName(t.trap)}. `}</span>
                {t.why}
              </span>
            </p>
            <Button
              type="button"
              disabled={!ex.feeling}
              onClick={() => {
                if (i < ex.thoughts.length - 1) setThoughtIndex(i + 1);
                else save({ part: "reframe" });
              }}
            >
              {i < ex.thoughts.length - 1 ? "Next thought" : "Reframe a thought"}
            </Button>
          </>
        ) : null}
      </div>
    );
  };

  const listLayout = (ex: ReframeExerciseRow) => (
    <div className="space-y-5">
      <TrapGuide options={options} />
      {ex.thoughts.map((t, i) => (
        <div key={t.id} className="space-y-2" data-testid="thought-question">
          <p className="text-muted-foreground text-xs">Thought {i + 1}</p>
          <blockquote className="border-l-2 border-zinc-900 pl-3 italic text-zinc-900">{t.text}</blockquote>
          <TrapPicker
            options={options}
            picked={answers[t.id]}
            onPick={(a) => setAnswer(t.id, a)}
            label={`Which trap is in: ${t.text}`}
            showQuestions={false}
          />
        </div>
      ))}
    </div>
  );

  const monologue = (ex: ReframeExerciseRow) => {
    const sel: ReframeThought | undefined = ex.thoughts.find((t) => t.id === selectedThought);
    return (
      <div className="space-y-4">
        <TrapGuide options={options} />
        <p className="text-muted-foreground text-xs">Tap a thought to mark it. Leave fair thoughts as they are.</p>
        <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900" data-testid="monologue">
          {ex.thoughts.map((t) => {
            const a = answers[t.id];
            const marked = a != null && a !== "realistic";
            return (
              <span key={t.id}>
                <button
                  type="button"
                  aria-pressed={selectedThought === t.id}
                  onClick={() => setSelectedThought(t.id)}
                  className={cn(
                    "rounded px-0.5 text-left underline decoration-dotted underline-offset-4",
                    selectedThought === t.id ? "bg-zinc-200" : marked ? "bg-zinc-100 decoration-solid" : "hover:bg-zinc-50",
                  )}
                >
                  {t.text}
                </button>
                {marked ? <span className="text-muted-foreground ml-1 text-xs">[{answerName(a)}]</span> : null}{" "}
              </span>
            );
          })}
        </p>
        {sel ? (
          <div className="space-y-2" data-testid="thought-question">
            <p className="text-sm font-medium text-zinc-900">&ldquo;{sel.text}&rdquo;</p>
            <TrapPicker
              options={options}
              picked={answers[sel.id]}
              onPick={(a) => setAnswer(sel.id, a)}
              label={`Which trap is in: ${sel.text}`}
              showQuestions={false}
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <ExerciseShell stepIndex={phase} stepLabels={practiceStepLabels("Think it through")} partLabel={partLabel}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {needsSupport ? (
        <Alert data-testid="reframe-support">
          <AlertTitle>{REFRAME_SUPPORT_MESSAGE.title}</AlertTitle>
          <AlertDescription>
            {REFRAME_SUPPORT_MESSAGE.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? (
        <ExerciseStepCard
          data-testid="reframe-setup"
          title="Reframe"
          description="Spot thinking traps, then rewrite one thought."
        >
          <LevelPicker
            value={level}
            onChange={chooseLevel}
            descriptions={{
              guided: REFRAME_LEVELS.guided.description,
              standard: REFRAME_LEVELS.standard.description,
              expert: REFRAME_LEVELS.expert.description,
            }}
            note={`Takes ${setupLevel.minutes}. This is thinking practice, not therapy.`}
          />
          <div className="grid gap-2">
            <Label>Area of life</Label>
            <div className="flex flex-wrap gap-2" data-testid="reframe-areas">
              {REFRAME_AREAS.map((a) => (
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
              value={(REFRAME_AREAS as readonly string[]).includes(area) ? "" : area}
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
                    placeholder="What happened, and what went through your mind right after."
                  />
                  <p className="text-muted-foreground text-xs">
                    Private. No real names. In crisis? Talk to someone you trust.
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
          data-testid="reframe-exercise-card"
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
              onDone={() => save({ part: "spot" })}
            />
          ) : null}

          {part === "spot" ? (
            <>
              {scenarioBlock}
              {feelingBlock}
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-900">Now look at the thoughts that came next.</p>
                <p className="text-muted-foreground text-xs" data-testid="count-hint">
                  {countHint}
                </p>
              </div>
              {cfg.layout === "one-by-one" ? oneByOne(exercise) : cfg.layout === "list" ? listLayout(exercise) : monologue(exercise)}
              {cfg.layout !== "one-by-one" ? (
                <Button
                  type="button"
                  disabled={!thoughtsDone || !exercise.feeling}
                  onClick={() => save({ part: "reframe" })}
                >
                  Reframe a thought
                </Button>
              ) : null}
              {!exercise.feeling ? <p className="text-muted-foreground text-xs">Name the feeling first to go on.</p> : null}
            </>
          ) : null}

          {part === "reframe" && target ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900">Rewrite this thought in a fair, balanced way.</p>
                <blockquote className="border-l-2 border-zinc-900 pl-3 text-base italic text-zinc-900" data-testid="rewrite-target">
                  {target.text}
                </blockquote>
                <p className="text-muted-foreground text-xs">
                  Balanced, not positive. Stay true to the facts.
                </p>
              </div>
              {cfg.rewrite === "choose" ? (
                <div className="grid gap-2" role="radiogroup" aria-label={exercise.rewrite.question}>
                  <p className="text-sm font-medium text-zinc-900">{exercise.rewrite.question}</p>
                  {rewriteOrder.map((oi) => (
                    <button
                      key={oi}
                      type="button"
                      role="radio"
                      aria-checked={exercise.rewriteChoice === oi}
                      onClick={() => save({ rewriteChoice: oi })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left text-sm",
                        exercise.rewriteChoice === oi ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50",
                      )}
                    >
                      {exercise.rewrite.options[oi]}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {cfg.rewrite === "evidence" ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="reframe-for">What facts support this thought?</Label>
                        <Textarea
                          id="reframe-for"
                          rows={2}
                          value={exercise.evidenceFor ?? ""}
                          onChange={(e) => save({ evidenceFor: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="reframe-against">What facts do not fit it?</Label>
                        <Textarea
                          id="reframe-against"
                          rows={2}
                          value={exercise.evidenceAgainst ?? ""}
                          onChange={(e) => save({ evidenceAgainst: e.target.value })}
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="grid gap-2">
                    <Label htmlFor="reframe-balanced">Your balanced thought</Label>
                    <Textarea
                      id="reframe-balanced"
                      rows={3}
                      value={exercise.balancedThought ?? ""}
                      onChange={(e) => save({ balancedThought: e.target.value })}
                      placeholder="What is a fairer way to say it to yourself?"
                    />
                  </div>
                </>
              )}
              <FeelingSlider
                id="intensity-after"
                label={`How strong is the feeling${exercise.feeling ? ` (${exercise.feeling.toLowerCase()})` : ""} now?`}
                value={exercise.intensityAfter ?? exercise.intensityBefore ?? 50}
                onChange={(v) => save({ intensityAfter: v })}
              />
              <ConfidenceSlider
                value={confidence}
                onChange={setConfidence}
                label="How sure are you about the traps you found?"
              />
              {loading ? <PerspectiveLoadingCard /> : null}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={loading} onClick={() => save({ part: "spot" })}>
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
          <ReframeAnswerKey
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
                void dismissLevelSuggestion("reframe");
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
            takeawayPlaceholder="Which trap will you watch for in your own thoughts this week?"
          />
        </div>
      ) : null}
    </ExerciseShell>
  );
}
