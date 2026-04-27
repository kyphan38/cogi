"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExerciseShell } from "@/components/shared/ExerciseShell";
import { HighlightTag } from "@/components/exercises/HighlightTag";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { AIPerspective } from "@/components/shared/AIPerspective";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/toast";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import type {
  AnalyticalExerciseRow,
  ConfidenceRecord,
  UserHighlight,
} from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";
import type { AnalyticalExercise } from "@/lib/ai/validators/common";
import { AdaptiveSetupHint } from "@/components/adaptive/AdaptiveSetupHint";
import { buildAdaptiveHintsForRequest } from "@/lib/adaptive/adaptive-hints";
import { putExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { completeExerciseFlow } from "@/lib/db/complete-exercise";
import {
  getPromptIdsUsedInLastNCompleted,
  getRecentJournalSnippetsForDomain,
} from "@/lib/db/journal";
import { pickJournalPrompts, type JournalPromptItem } from "@/lib/ai/prompts/journal-pool";
import { computeAnalyticalAccuracy } from "@/lib/analytics/calibration-analytical";
import { scoreEmbeddedIssueCatch } from "@/lib/analytics/analytical-per-issue";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { aiFetch } from "@/lib/api/ai-fetch";
import { parsePerspectiveFetchJson } from "@/lib/ai/perspective-response";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import { sanitizeRealDataText } from "@/lib/text/sanitizeRealData";
import { sanitizeUserPasteOrClipboard } from "@/lib/text/sanitizeRealDataBrowser";
import { DomainInput } from "@/components/shared/DomainInput";
import { listRecentDomains } from "@/lib/db/exercises";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function AnalyticalExerciseFlow() {
  const { show: showToast } = useToast();
  const [step, setStep] = useState<FlowStep>(0);
  const [domain, setDomain] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState<AnalyticalExerciseRow | null>(null);
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [confidence, setConfidence] = useState(50);
  const [perspectiveText, setPerspectiveText] = useState<string | null>(null);
  const [perspectiveStructured, setPerspectiveStructured] =
    useState<AIPerspectiveStructured | null>(null);

  const [journalPrompts, setJournalPrompts] = useState<JournalPromptItem[]>([]);
  const [journalAnswers, setJournalAnswers] = useState<Record<string, string>>({});
  const [aiRefLine, setAiRefLine] = useState<string | null>(null);
  const [journalPrimed, setJournalPrimed] = useState(false);
  const journalEffectIdRef = useRef(0);
  const [emotionLabel, setEmotionLabel] = useState<
    "anxious" | "excited" | "frustrated" | "confident" | "uncertain" | "defensive" | "neutral"
  >("neutral");

  const [actionText, setActionText] = useState("");

  const [mode, setMode] = useState<"generated" | "real_data">("generated");
  const [realText, setRealText] = useState("");
  const [realWordCount, setRealWordCount] = useState(0);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const realTextareaRef = useRef<HTMLTextAreaElement>(null);

  const realSanitizedPreview = useMemo(() => sanitizeRealDataText(realText), [realText]);

  useEffect(() => {
    void listRecentDomains(20).then(setDomainSuggestions);
  }, []);

  const startGenerate = useCallback(async () => {
    setError(null);
    setPasteNotice(null);
    const d = domain.trim();
    if (!d) {
      setError("Enter a domain.");
      return;
    }
    let sanitizedUserText: string | undefined;
    if (mode === "real_data") {
      const trimmed = realText.trim();
      if (!trimmed) {
        setError("Paste your text before generating an exercise.");
        return;
      }
      const client = sanitizeUserPasteOrClipboard(realText);
      if (client.htmlRejected) {
        setError(
          "That paste looked like unsafe HTML (script, iframe, or embed). Paste plain text only.",
        );
        return;
      }
      if (client.wordCount > 2000) {
        setError(
          "Your text is too long. Please paste only the most relevant section. (Max 2,000 words after sanitization.)",
        );
        return;
      }
      sanitizedUserText = client.text;
      setRealText(client.text);
      setRealWordCount(client.wordCount);
    }
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const userTextForReal = mode === "real_data" ? sanitizedUserText : undefined;
      const adaptiveHints = await buildAdaptiveHintsForRequest("analytical");
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: d,
          userContext: userContext || undefined,
          exerciseType: "analytical",
          mode,
          userText: mode === "real_data" ? userTextForReal : undefined,
          adaptiveHints,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; data: AnalyticalExercise }
        | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const data = json.data;
      const id = crypto.randomUUID();
      const row: AnalyticalExerciseRow = {
        id,
        type: "analytical",
        domain: d,
        source: mode === "real_data" ? "real_data" : "ai",
        title: data.title,
        passage: data.passage,
        originalUserText: mode === "real_data" ? (sanitizedUserText ?? null) : null,
        isSoundReasoning: data.isSoundReasoning === true,
        embeddedIssues: data.embeddedIssues,
        validPoints: data.validPoints,
        userHighlights: [],
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      await putExercise(row);
      setExercise(row);
      setHighlights([]);
      setPerspectiveText(null);
      setPerspectiveStructured(null);
      setJournalAnswers({});
      setAiRefLine(null);
      setJournalPrimed(false);
      setEmotionLabel("neutral");
      setActionText("");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }, [domain, mode, realText]);

  const regenerate = () => {
    if (highlights.length > 0) {
      const ok = window.confirm("Discard current work and regenerate?");
      if (!ok) return;
    }
    setError(null);
    void startGenerate();
  };

  const submitHighlightsAndConfidence = async () => {
    if (!exercise) return;
    if (perspectiveText != null) {
      setStep(3);
      return;
    }
    if (highlights.length < 1) {
      setError("Add at least one highlight before continuing.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userContext = await getUserContext();
      const res = await aiFetch("/api/ai/perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exercise.title,
          passage: exercise.passage,
          embeddedIssues: exercise.embeddedIssues,
          validPoints: exercise.validPoints,
          userHighlights: highlights,
          confidenceBefore: confidence,
          domain: exercise.domain,
          userContext: userContext || undefined,
        }),
      });
      const json = await res.json();
      const parsed = parsePerspectiveFetchJson(json);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setPerspectiveText(parsed.text);
      setPerspectiveStructured(parsed.structured);
      const partial: AnalyticalExerciseRow = {
        ...exercise,
        userHighlights: highlights,
        confidenceBefore: confidence,
        aiPerspective: parsed.text,
        aiPerspectiveStructured: parsed.structured,
      };
      await putExercise(partial);
      setExercise(partial);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perspective failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 4 || journalPrimed || !exercise) return;
    const effectId = ++journalEffectIdRef.current;
    let cancelled = false;
    (async () => {
      try {
        const excluded = await getPromptIdsUsedInLastNCompleted(5);
        const accuracy = computeAnalyticalAccuracy(
          exercise.passage,
          exercise.embeddedIssues,
          exercise.validPoints,
          highlights,
          exercise.isSoundReasoning === true,
        );
        const missedIssueTypes = exercise.embeddedIssues
          .filter((issue) => scoreEmbeddedIssueCatch(exercise.passage, issue, highlights) < 58)
          .map((issue) => issue.type);
        const picks = pickJournalPrompts(excluded, {
          exerciseType: "analytical",
          missedIssueTypes,
          accuracy,
          confidenceBefore: confidence,
          overconfident: confidence - accuracy > 20,
          underconfident: accuracy - confidence > 20,
        });
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        setJournalPrompts(picks);
        const init: Record<string, string> = {};
        picks.forEach((p) => {
          init[p.id] = "";
        });
        setJournalAnswers(init);
        setJournalPrimed(true);

        const snippets = await getRecentJournalSnippetsForDomain(
          exercise.domain,
          3,
        );
        if (cancelled || effectId !== journalEffectIdRef.current) return;
        if (snippets.length === 0) {
          setAiRefLine(null);
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
    const accuracy = computeAnalyticalAccuracy(
      exercise.passage,
      exercise.embeddedIssues,
      exercise.validPoints,
      highlights,
      exercise.isSoundReasoning === true,
    );
    const confidenceRecord: ConfidenceRecord = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      confidenceBefore: confidence,
      actualAccuracy: accuracy,
      gap: confidence - accuracy,
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
      weeklyFollowThrough: [
        { weekKey: currentIsoWeekKey(), done: false },
      ],
      createdAt: new Date().toISOString(),
    };
    const finalEx: AnalyticalExerciseRow = {
      ...exercise,
      userHighlights: highlights,
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
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const shellStep =
    step === 0
      ? 0
      : step === 1
        ? 1
        : step === 2
          ? 2
          : step === 3
            ? 3
            : step === 4
              ? 4
              : step === 5
                ? 5
                : 6;

  return (
    <ExerciseShell stepIndex={shellStep}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          {step === 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                setError(null);
                void startGenerate();
              }}
            >
              Retry
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Analytical exercise</CardTitle>
            <CardDescription>
              Generate a passage, then highlight and tag issues before reflecting.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <DomainInput value={domain} onChange={setDomain} suggestions={domainSuggestions} />
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select
                value={mode}
                onValueChange={(v) =>
                  setMode((v as "generated" | "real_data") ?? "generated")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generated">AI-generated passage</SelectItem>
                  <SelectItem value="real_data">Use my own text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "real_data" ? (
              <div className="grid gap-2">
                <Label htmlFor="real-text">
                  Paste your own content (up to 2,000 words after sanitization)
                </Label>
                <Textarea
                  ref={realTextareaRef}
                  id="real-text"
                  rows={6}
                  value={realText}
                  onChange={(e) => {
                    setRealText(e.target.value);
                    setPasteNotice(null);
                  }}
                  onPaste={(e) => {
                    const plain = e.clipboardData.getData("text/plain");
                    if (!plain) return;
                    e.preventDefault();
                    const el = realTextareaRef.current;
                    const start = el?.selectionStart ?? realText.length;
                    const end = el?.selectionEnd ?? realText.length;
                    const r = sanitizeUserPasteOrClipboard(plain);
                    if (r.htmlRejected) {
                      setPasteNotice("Blocked unsafe HTML from clipboard. Use plain text.");
                      return;
                    }
                    const next = `${realText.slice(0, start)}${r.text}${realText.slice(end)}`;
                    setRealText(next);
                    if (r.hadBlockedHtml) {
                      setPasteNotice("Some HTML tags were removed from the paste.");
                    } else {
                      setPasteNotice(null);
                    }
                    requestAnimationFrame(() => {
                      if (!el) return;
                      const pos = start + r.text.length;
                      el.selectionStart = pos;
                      el.selectionEnd = pos;
                    });
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    onClick={() => {
                      void (async () => {
                        try {
                          const t = await navigator.clipboard.readText();
                          const r = sanitizeUserPasteOrClipboard(t);
                          if (r.htmlRejected) {
                            setPasteNotice("Blocked unsafe HTML from clipboard.");
                            return;
                          }
                          setRealText(r.text);
                          setRealWordCount(r.wordCount);
                          setPasteNotice(null);
                          showToast(
                            r.hadBlockedHtml
                              ? "Some HTML was flattened to plain text."
                              : "Imported from clipboard.",
                            r.hadBlockedHtml ? "info" : "success",
                          );
                        } catch {
                          showToast(
                            "Could not read clipboard. Grant permission or paste manually.",
                            "error",
                          );
                        }
                      })();
                    }}
                  >
                    Import from clipboard
                  </Button>
                </div>
                {pasteNotice ? (
                  <p className="text-muted-foreground text-xs">{pasteNotice}</p>
                ) : null}
                {realText.trim() ? (
                  <p className="text-muted-foreground text-xs">
                    Words after sanitization (same rules as server): {realSanitizedPreview.wordCount}
                    {realSanitizedPreview.wordCount > 2000 ? (
                      <span className="text-destructive font-medium">
                        {" "}
                        — over 2,000; shorten before generating.
                      </span>
                    ) : null}
                    {realWordCount ? ` · Last generate used: ${realWordCount} words` : null}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Tip: paste an email, plan, or article you want to analyze.
                  </p>
                )}
              </div>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Personal context for AI is read from{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              .
            </p>
            <AdaptiveSetupHint exerciseType="analytical" />
            <Button type="button" disabled={loading} onClick={startGenerate}>
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
            <CardDescription>
              Domain: {exercise.domain}
              {exercise.isSoundReasoning === true ? (
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                  Sound reasoning
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HighlightTag
              passage={exercise.passage}
              highlights={highlights}
              onChange={setHighlights}
              onSelectionOverlap={() =>
                setError("Selection overlaps an existing highlight. Remove or adjust first.")
              }
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={regenerate}>
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  if (highlights.length < 1) {
                    setError("Add at least one highlight.");
                    return;
                  }
                  setStep(2);
                }}
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
              Set how confident you are before viewing the AI perspective.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
            {loading ? <PerspectiveLoadingCard /> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void submitHighlightsAndConfidence()}
              >
                {loading ? (
                  <>
                    <InlineSpinner /> Loading perspective…
                  </>
                ) : (
                  "Submit and get AI perspective"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && exercise && perspectiveText ? (
        <div className="space-y-4">
          <AIPerspective
            text={perspectiveText}
            structured={perspectiveStructured ?? exercise.aiPerspectiveStructured ?? null}
            exerciseId={exercise.id}
            perspectiveKind="analytical"
            exerciseTitle={exercise.title}
            domain={exercise.domain}
          />
          <Button type="button" onClick={() => setStep(4)}>
            Continue to journal
          </Button>
        </div>
      ) : null}

      {step === 4 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Metacognition journal</CardTitle>
            <CardDescription>
              Reflect on at least two prompts (more than 10 characters each).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!journalPrimed ? (
              <p className="text-muted-foreground text-sm">Preparing prompts…</p>
            ) : (
              <>
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
                  <p className="text-muted-foreground border-l-2 pl-3 text-sm italic">
                    {aiRefLine}
                  </p>
                ) : null}
                {journalPrompts.map((p) => (
                  <div key={p.id} className="grid gap-2">
                    <Label htmlFor={p.id}>{p.text}</Label>
                    <Textarea
                      id={p.id}
                      rows={3}
                      value={journalAnswers[p.id] ?? ""}
                      onChange={(e) =>
                        setJournalAnswers((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setError(null);
                      if (!journalValid()) {
                        setError("Need two answers with more than 10 characters.");
                        return;
                      }
                      setStep(5);
                    }}
                  >
                    Continue to action
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 5 && exercise ? (
        <Card>
          <CardHeader>
            <CardTitle>Action bridge</CardTitle>
            <CardDescription>
              One concrete action you will take in real life (at least 15 characters).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={3}
              placeholder="e.g. Schedule a 30-minute review of our incident runbook with the team."
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(4)}>
                Back
              </Button>
              <Button type="button" onClick={() => void finishExercise()}>
                Finish exercise
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle>Exercise saved</CardTitle>
            <CardDescription>
              When you finish the exercise, your responses, journal, and action are saved to your
              account (Firebase).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex items-center justify-center",
              )}
            >
              Back to home
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.assign("/exercise/analytical");
              }}
            >
              Start another
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </ExerciseShell>
  );
}
