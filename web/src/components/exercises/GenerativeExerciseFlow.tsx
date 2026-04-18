"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdaptiveSetupHint } from "@/components/adaptive/AdaptiveSetupHint";
import { ExerciseShell, GENERATIVE_EXERCISE_STEP_LABELS } from "@/components/shared/ExerciseShell";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { Button, buttonVariants } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ConfidenceRecord, GenerativeExerciseRow } from "@/lib/types/exercise";
import type { GenerativeExercisePayload } from "@/lib/ai/validators/generative";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import { buildAdaptiveHintsForRequest } from "@/lib/adaptive/adaptive-hints";
import { countCompletedByType, putExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { completeExerciseFlow } from "@/lib/db/complete-exercise";
import {
  getPromptIdsUsedInLastNCompleted,
  getRecentJournalSnippetsForDomain,
} from "@/lib/db/journal";
import { pickJournalPrompts, type JournalPromptItem } from "@/lib/ai/prompts/journal-pool";
import { generativeRubricToAccuracy } from "@/lib/analytics/calibration-generative";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { getGenerativeStageFromCompletedCount } from "@/lib/generative-scaffold";
import { aiFetch } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import type { DebateChatMessage } from "@/lib/ai/prompts/generative-debate";

const DOMAINS = [
  "DevOps / SRE",
  "MLOps / Data Engineering",
  "Solution Architecture",
  "HPC",
  "Financial Planning",
  "Life Strategy",
  "Social & Communication",
  "Custom",
] as const;

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const MAX_DEBATE_USER_TURNS = 3;

function buildRowFromPayload(
  id: string,
  domain: string,
  stage: GenerativeExerciseRow["stageAtStart"],
  data: GenerativeExercisePayload,
): GenerativeExerciseRow {
  const answers: Record<string, string> = {};
  const draftBaseline: Record<string, string> = {};
  for (const p of data.prompts) {
    if (stage === "edit" && p.draftText) {
      answers[p.id] = p.draftText;
      draftBaseline[p.id] = p.draftText;
    } else {
      answers[p.id] = "";
    }
  }
  return {
    id,
    type: "generative",
    domain,
    title: data.title,
    scenario: data.scenario,
    stageAtStart: stage,
    prompts: data.prompts.map((p) => ({
      id: p.id,
      question: p.question,
      draftText: p.draftText,
      hints: p.hints,
      spareHint: p.spareHint,
    })),
    answers,
    draftBaseline,
    debateOpening: null,
    debateTurns: [],
    rubricScore: null,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

function editStageValid(row: GenerativeExerciseRow): boolean {
  if (row.stageAtStart !== "edit") return true;
  let changed = 0;
  for (const p of row.prompts) {
    const cur = (row.answers[p.id] ?? "").trim();
    const base = (row.draftBaseline[p.id] ?? "").trim();
    if (cur !== base) changed += 1;
  }
  return changed >= 2;
}

function allPromptsNonEmpty(row: GenerativeExerciseRow, minLen: number): boolean {
  return row.prompts.every((p) => (row.answers[p.id] ?? "").trim().length >= minLen);
}

export function GenerativeExerciseFlow() {
  const [step, setStep] = useState<FlowStep>(0);
  const [domainChoice, setDomainChoice] = useState<string>(DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState<GenerativeExerciseRow | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hintRevealed, setHintRevealed] = useState<Record<string, boolean>>({});

  const [confidence, setConfidence] = useState(50);
  const [debateOpening, setDebateOpening] = useState<string | null>(null);
  const [debateTurns, setDebateTurns] = useState<{ userText: string; assistantText: string }[]>(
    [],
  );
  const [debateDraft, setDebateDraft] = useState("");
  const [debateLoading, setDebateLoading] = useState(false);

  const [rubricScore, setRubricScore] = useState<number | null>(null);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [journalPrompts, setJournalPrompts] = useState<JournalPromptItem[]>([]);
  const [journalAnswers, setJournalAnswers] = useState<Record<string, string>>({});
  const [aiRefLine, setAiRefLine] = useState<string | null>(null);
  const [journalPrimed, setJournalPrimed] = useState(false);

  const [actionText, setActionText] = useState("");

  const [emotionLabel, setEmotionLabel] = useState<
    "anxious" | "excited" | "frustrated" | "confident" | "uncertain" | "defensive" | "neutral"
  >("neutral");

  const debateEffectIdRef = useRef(0);
  const journalEffectIdRef = useRef(0);

  const effectiveDomain =
    domainChoice === "Custom" ? customDomain.trim() : domainChoice;

  const mergedExercise = useCallback((): GenerativeExerciseRow | null => {
    if (!exercise) return null;
    return {
      ...exercise,
      answers,
      debateOpening,
      debateTurns,
      rubricScore,
    };
  }, [exercise, answers, debateOpening, debateTurns, rubricScore]);

  const startGenerate = useCallback(async () => {
    setError(null);
    if (!effectiveDomain) {
      setError("Choose or enter a domain.");
      return;
    }
    setLoading(true);
    try {
      const completed = await countCompletedByType("generative");
      const generativeStage = getGenerativeStageFromCompletedCount(completed);
      const userContext = await getUserContext();
      const adaptiveHints = await buildAdaptiveHintsForRequest("generative");
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: effectiveDomain,
          userContext: userContext || undefined,
          exerciseType: "generative",
          generativeStage,
          adaptiveHints,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; data: GenerativeExercisePayload }
        | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const id = crypto.randomUUID();
      const row = buildRowFromPayload(id, effectiveDomain, generativeStage, json.data);
      await putExercise(row);
      setExercise(row);
      setAnswers(row.answers);
      setHintRevealed({});
      setDebateOpening(null);
      setDebateTurns([]);
      setDebateDraft("");
      setRubricScore(null);
      setPerspectiveText(null);
      setPerspectiveStructured(null);
      setJournalAnswers({});
      setAiRefLine(null);
      setJournalPrimed(false);
      setActionText("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }, [effectiveDomain]);

  useEffect(() => {
    if (step !== 3 || !exercise || debateOpening !== null || debateLoading) return;
    const effectId = ++debateEffectIdRef.current;
    let cancelled = false;
    void (async () => {
      setDebateLoading(true);
      setError(null);
      try {
        const qa = exercise.prompts.map((p) => ({
          id: p.id,
          question: p.question,
          answer: answers[p.id] ?? "",
        }));
        const res = await aiFetch("/api/ai/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "start",
            domain: exercise.domain,
            title: exercise.title,
            scenario: exercise.scenario,
            qa,
          }),
        });
        const json = (await res.json()) as { ok: true; text: string } | { ok: false; error: string };
        if (cancelled || effectId !== debateEffectIdRef.current) return;
        if (!json.ok) {
          setError(json.error);
          return;
        }
        setDebateOpening(json.text);
        const partial: GenerativeExerciseRow = {
          ...exercise,
          answers,
          debateOpening: json.text,
          debateTurns,
        };
        await putExercise(partial);
        if (effectId !== debateEffectIdRef.current) return;
        setExercise(partial);
      } catch (e) {
        if (!cancelled && effectId === debateEffectIdRef.current) {
          setError(e instanceof Error ? e.message : "Debate start failed");
        }
      } finally {
        if (effectId === debateEffectIdRef.current) setDebateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, exercise, debateOpening, debateLoading, answers, debateTurns]);

  const debateHistoryMessages = (): DebateChatMessage[] => {
    const h: DebateChatMessage[] = [];
    if (debateOpening) h.push({ role: "assistant", content: debateOpening });
    for (const t of debateTurns) {
      h.push({ role: "user", content: t.userText });
      h.push({ role: "assistant", content: t.assistantText });
    }
    return h;
  };

  const sendDebateReply = async () => {
    if (!exercise || !debateOpening) return;
    if (debateTurns.length >= MAX_DEBATE_USER_TURNS) return;
    const reply = debateDraft.trim();
    if (!reply) {
      setError("Write a reply before sending.");
      return;
    }
    setError(null);
    setDebateLoading(true);
    try {
      const res = await aiFetch("/api/ai/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "continue",
          domain: exercise.domain,
          title: exercise.title,
          history: debateHistoryMessages(),
          userReply: reply,
        }),
      });
      const json = (await res.json()) as { ok: true; text: string } | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const nextTurns = [...debateTurns, { userText: reply, assistantText: json.text }];
      setDebateTurns(nextTurns);
      setDebateDraft("");
      const partial: GenerativeExerciseRow = {
        ...exercise,
        answers,
        debateOpening,
        debateTurns: nextTurns,
      };
      await putExercise(partial);
      setExercise(partial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debate failed");
    } finally {
      setDebateLoading(false);
    }
  };

  const finishDebateAndReflect = async () => {
    const base = mergedExercise();
    if (!base || !debateOpening) return;
    if (perspectiveText != null) {
      setStep(4);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const rubBody = { exercise: base };
      const rubRes = await aiFetch("/api/ai/generative-rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rubBody),
      });
      const rubJson = (await rubRes.json()) as
        | { ok: true; overall: number }
        | { ok: false; error: string };
      const score = rubJson.ok ? rubJson.overall : 0;
      if (!rubJson.ok) setError(rubJson.error);
      setRubricScore(score);

      const exWithRubric: GenerativeExerciseRow = { ...base, rubricScore: score };
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "generative",
          confidenceBefore: confidence,
          exercise: exWithRubric,
          userContext: userContext || undefined,
        }),
      });
      const pjRaw = await res.json();
      const pj = parsePerspectiveFetchJson(pjRaw);
      if (!pj.ok) {
        setError(pj.error);
        return;
      }
      setPerspectiveText(pj.text);
      setPerspectiveStructured(pj.structured);
      const partial: GenerativeExerciseRow = {
        ...exWithRubric,
        confidenceBefore: confidence,
        aiPerspective: pj.text,
        aiPerspectiveStructured: pj.structured,
      };
      await putExercise(partial);
      setExercise(partial);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reflection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 5 || journalPrimed || !exercise) return;
    const effectId = ++journalEffectIdRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const excluded = await getPromptIdsUsedInLastNCompleted(5);
        const picks = pickJournalPrompts(excluded);
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        setJournalPrompts(picks);
        const init: Record<string, string> = {};
        picks.forEach((p) => {
          init[p.id] = "";
        });
        setJournalAnswers(init);

        const snippets = await getRecentJournalSnippetsForDomain(exercise.domain, 3);
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        if (snippets.length === 0) {
          setAiRefLine(null);
          setJournalPrimed(true);
          return;
        }
        const res = await aiFetch("/api/ai/journal-ref", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            domain: exercise.domain,
            snippets,
          }),
        });
        const j = (await res.json()) as { ok: true; line: string | null };
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        if (j.ok && j.line) setAiRefLine(j.line);
      } catch {
        if (!cancelled && effectId === journalEffectIdRef.current) setAiRefLine(null);
      } finally {
        if (!cancelled && effectId === journalEffectIdRef.current) setJournalPrimed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, journalPrimed, exercise]);

  const journalValid = () => {
    const vals = Object.values(journalAnswers);
    const long = vals.filter((v) => v.trim().length > 10);
    return long.length >= 2;
  };

  const finishExercise = async () => {
    if (!exercise || !perspectiveText) return;
    if (!journalValid()) {
      setError("Answer at least two prompts with more than 10 characters each.");
      return;
    }
    if (actionText.trim().length < 15) {
      setError("Action must be at least 15 characters.");
      return;
    }
    setError(null);
    const acc = generativeRubricToAccuracy(rubricScore ?? 0);
    const confidenceRecord: ConfidenceRecord = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      confidenceBefore: confidence,
      actualAccuracy: acc,
      gap: confidence - acc,
      createdAt: new Date().toISOString(),
    };
    const journalEntry: JournalEntry = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      promptIds: journalPrompts.map((p) => p.id),
      aiReferenceLine: aiRefLine,
      responses: { ...journalAnswers },
      emotionLabel,
      createdAt: new Date().toISOString(),
    };
    const action: ActionBridge = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      oneAction: actionText.trim(),
      weeklyFollowThrough: [{ weekKey: currentIsoWeekKey(), done: false }],
      createdAt: new Date().toISOString(),
    };
    const finalEx: GenerativeExerciseRow = {
      ...exercise,
      answers,
      debateOpening,
      debateTurns,
      rubricScore: rubricScore ?? 0,
      confidenceBefore: confidence,
      aiPerspective: perspectiveText,
      aiPerspectiveStructured: perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null,
      completedAt: new Date().toISOString(),
    };
    try {
      await completeExerciseFlow({
        exercise: finalEx,
        journal: journalEntry,
        confidence: confidenceRecord,
        action,
      });
      setExercise(finalEx);
      setStep(7);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const shellStep = step;

  const rowForWriteGate = exercise
    ? { ...exercise, answers }
    : null;

  return (
    <ExerciseShell stepIndex={shellStep} stepLabels={GENERATIVE_EXERCISE_STEP_LABELS}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Generative exercise</CardTitle>
            <CardDescription>
              Structured writing with a scaffold that eases into typing, then a short debate with
              the model.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <Select
                value={domainChoice}
                onValueChange={(v) => setDomainChoice(v ?? DOMAINS[0])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {domainChoice === "Custom" ? (
                <Input
                  placeholder="Custom domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              Personal context for AI is read from{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              .
            </p>
            <AdaptiveSetupHint exerciseType="generative" />
            <Button type="button" disabled={loading} onClick={() => void startGenerate()}>
              {loading ? (
                <>
                  <InlineSpinner /> Generating…
                </>
              ) : (
                "Generate exercise"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>{exercise.title}</CardTitle>
            <CardDescription className="leading-relaxed">{exercise.scenario}</CardDescription>
            {exercise.stageAtStart === "edit" ? (
              <p className="text-muted-foreground text-xs">
                AI drafted answers — edit them to reflect your thinking. You must change at least{" "}
                <strong>two</strong> of the four prompts from the original draft.
              </p>
            ) : exercise.stageAtStart === "hint" ? (
              <p className="text-muted-foreground text-xs">
                Use the hints under each question to write your own answers.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Answer each prompt. Optional hints stay hidden until you choose to show them.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {exercise.prompts.map((p) => (
              <div key={p.id} className="grid gap-2">
                <Label>{p.question}</Label>
                {exercise.stageAtStart === "hint" && p.hints?.length ? (
                  <ul className="text-muted-foreground list-inside list-disc text-sm">
                    {p.hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : null}
                {exercise.stageAtStart === "independent" && p.spareHint ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {!hintRevealed[p.id] ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setHintRevealed((prev) => ({
                            ...prev,
                            [p.id]: true,
                          }))
                        }
                      >
                        Show hint
                      </Button>
                    ) : (
                      <p className="text-muted-foreground border-l-2 pl-3 text-sm">{p.spareHint}</p>
                    )}
                  </div>
                ) : null}
                <Textarea
                  rows={5}
                  value={answers[p.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [p.id]: e.target.value,
                    }))
                  }
                  placeholder="Your answer…"
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={
                  !rowForWriteGate ||
                  !allPromptsNonEmpty(rowForWriteGate, 1) ||
                  !editStageValid(rowForWriteGate)
                }
              >
                Continue to confidence
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Confidence</CardTitle>
            <CardDescription>
              How confident are you in this written reasoning before the debate partner joins?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void putExercise({ ...exercise, answers });
                  setExercise({ ...exercise, answers });
                  setStep(3);
                }}
              >
                Continue to debate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Debate partner</CardTitle>
            <CardDescription>
              Respond to the challenge (up to {MAX_DEBATE_USER_TURNS} replies), then continue to
              reflection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {debateLoading && !debateOpening ? (
              <p className="text-muted-foreground text-sm">Opening challenge…</p>
            ) : null}
            {debateOpening ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {debateOpening}
              </div>
            ) : null}
            {debateTurns.map((t, i) => (
              <div key={i} className="space-y-2 border-t pt-3 text-sm">
                <p className="font-medium">You</p>
                <p className="whitespace-pre-wrap">{t.userText}</p>
                <p className="font-medium">Assistant</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{t.assistantText}</p>
              </div>
            ))}
            {debateOpening && debateTurns.length < MAX_DEBATE_USER_TURNS ? (
              <div className="grid gap-2">
                <Label>Your reply</Label>
                <Textarea
                  rows={4}
                  value={debateDraft}
                  onChange={(e) => setDebateDraft(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={debateLoading}
                  onClick={() => void sendDebateReply()}
                >
                  {debateLoading ? (
                    <>
                      <InlineSpinner /> Sending…
                    </>
                  ) : (
                    "Send reply"
                  )}
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  debateEffectIdRef.current += 1;
                  setDebateOpening(null);
                  setDebateTurns([]);
                  setDebateDraft("");
                  setStep(2);
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={!debateOpening || loading}
                onClick={() => void finishDebateAndReflect()}
              >
                {loading ? (
                  <>
                    <InlineSpinner /> Working…
                  </>
                ) : (
                  "Continue to AI reflection"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && exercise && perspectiveText ? (
        <Card>
          <CardHeader>
            <CardTitle>AI reflection</CardTitle>
            <CardDescription>Synthesis after your writing and debate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIPerspective
              text={perspectiveText}
              structured={perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null}
              exerciseId={exercise.id}
              perspectiveKind="generative"
              exerciseTitle={exercise.title}
              domain={exercise.domain}
            />
            <Button type="button" onClick={() => setStep(5)}>
              Continue to journal
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Journal</CardTitle>
            <CardDescription>At least two answers with more than 10 characters each.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>What emotion might be influencing your thinking right now?</Label>
              <Select
                value={emotionLabel}
                onValueChange={(v) =>
                  setEmotionLabel(
                    (v as
                      | "anxious"
                      | "excited"
                      | "frustrated"
                      | "confident"
                      | "uncertain"
                      | "defensive"
                      | "neutral") ?? "neutral",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anxious">Anxious</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="frustrated">Frustrated</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
                  <SelectItem value="uncertain">Uncertain</SelectItem>
                  <SelectItem value="defensive">Defensive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {aiRefLine ? (
              <p className="text-muted-foreground border-l-2 pl-3 text-sm italic">{aiRefLine}</p>
            ) : null}
            {journalPrompts.map((p) => (
              <div key={p.id} className="grid gap-2">
                <Label>{p.text}</Label>
                <Textarea
                  value={journalAnswers[p.id] ?? ""}
                  onChange={(e) =>
                    setJournalAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(6)}>
              Continue to action
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Action bridge</CardTitle>
            <CardDescription>One concrete action (min. 15 characters).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(5)}>
                Back
              </Button>
              <Button type="button" onClick={() => void finishExercise()}>
                Finish exercise
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 7 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Exercise saved</CardTitle>
            <CardDescription>Saved to your account (Firebase) in exercise history.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }))}>
              Home
            </Link>
            <Link href="/exercise/history" className={cn(buttonVariants({ variant: "outline" }))}>
              History
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </ExerciseShell>
  );
}
