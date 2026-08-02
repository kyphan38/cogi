"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AIPerspectiveStructured,
  EvaluativeScoringCriterionBreakdown,
} from "@/lib/types/perspective";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import { isLegacyPerspectiveStructured } from "@/lib/types/perspective";
import type { PerspectiveDisagreementRow, PerspectiveKind, PerspectiveSectionKey } from "@/lib/types/disagreement";
import {
  getPerspectiveViewModel,
  getStructuredPerspectiveSections,
} from "@/lib/perspective/format-structured";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import {
  listPerspectiveDisagreementsForExercise,
  putPerspectiveDisagreement,
} from "@/lib/db/disagreements";
import { highlightTerms as applyHighlightTerms } from "@/lib/text/highlight-terms";

export interface AIPerspectiveProps {
  text: string;
  structured?: AIPerspectiveStructured | null;
  exerciseId: string;
  perspectiveKind: PerspectiveKind;
  exerciseTitle: string;
  domain?: string;
  /** Client-computed weight/score breakdown, replaces the run-on "You wrote / selected" line for evaluative-scoring. */
  evaluativeScoringBreakdown?: EvaluativeScoringCriterionBreakdown[];
  /** Option titles + criterion/axis labels to highlight in AI-generated prose. Nothing else is highlighted. */
  highlightTerms?: string[];
}

function highlightedText(text: string, terms: string[] | undefined): ReactNode {
  return terms && terms.length > 0 ? applyHighlightTerms(text, terms) : text;
}

function disagreeKey(section: PerspectiveSectionKey, pointId: string) {
  return `${section}:${pointId}`;
}

function PerspectiveDiscussRow(props: {
  section: PerspectiveSectionKey;
  pointId: string;
  pointTitle: string | null;
  pointBody: string;
  exerciseId: string;
  perspectiveKind: PerspectiveKind;
  exerciseTitle: string;
  domain?: string;
  thread: PerspectiveDisagreementRow[];
  highlightTerms?: string[];
  onSaved?: () => void;
  children: React.ReactNode;
}) {
  const {
    section,
    pointId,
    pointTitle,
    pointBody,
    exerciseId,
    perspectiveKind,
    exerciseTitle,
    domain,
    thread,
    highlightTerms,
    onSaved,
    children,
  } = props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localTurns, setLocalTurns] = useState<PerspectiveDisagreementRow[]>(thread);

  useEffect(() => {
    setLocalTurns(thread);
  }, [thread]);

  const submit = useCallback(async () => {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < 15) {
      setError("Write at least 15 characters.");
      return;
    }
    setLoading(true);
    try {
      const requestId = crypto.randomUUID();
      const res = await aiFetch("/api/ai/disagree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          exerciseId,
          kind: perspectiveKind,
          section,
          exerciseTitle,
          domain: domain ?? "",
          pointId,
          pointTitle,
          pointBody,
          userReason: trimmed,
        }),
      });
      const data = await safeAiJson<
        | {
            ok: true;
            text: string;
            saved?: { saved: true; id: string; path: string; savedAt: string };
          }
        | { ok: false; error: string }
      >(res);
      if (!data.ok) {
        setError(data.error);
        return;
      }
      const row: PerspectiveDisagreementRow = {
        id: requestId,
        exerciseId,
        kind: perspectiveKind,
        section,
        pointId,
        pointTitle,
        pointBody,
        userReason: trimmed,
        aiReply: data.text,
        createdAt: new Date().toISOString(),
      };
      if (!data.saved?.saved) {
        await putPerspectiveDisagreement(row);
      }
      setLocalTurns((prev) => [...prev, row]);
      setOpen(false);
      setReason("");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [
    reason,
    perspectiveKind,
    section,
    exerciseTitle,
    domain,
    pointId,
    pointTitle,
    pointBody,
    exerciseId,
    onSaved,
  ]);

  return (
    <li className="border-muted space-y-2 border-b py-3 last:border-0">
      {children}
      {localTurns.length > 0 ? (
        <div className="space-y-2">
          {localTurns.map((t) => (
            <div key={t.id} className="space-y-1">
              <p className="text-muted-foreground text-xs italic">You: {t.userReason}</p>
              <DisagreeReply text={t.aiReply} highlightTerms={highlightTerms} />
            </div>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="grid max-w-xl gap-2">
          <Label htmlFor={`dis-${section}-${pointId}`}>What would you like to discuss?</Label>
          <Textarea
            id={`dis-${section}-${pointId}`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Agree, disagree, or ask to go deeper…"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={loading} onClick={() => void submit()}>
              {loading ? (
                <>
                  <InlineSpinner /> Sending…
                </>
              ) : (
                "Send"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {localTurns.length === 0 ? "Discuss" : "Continue discussion"}
        </Button>
      )}
    </li>
  );
}

function DisagreeReply({ text, highlightTerms }: { text: string; highlightTerms?: string[] }) {
  return (
    <div className="bg-muted/50 rounded-md p-3 text-xs leading-relaxed">
      <p className="text-foreground mb-1 font-medium">AI reply</p>
      <p className="text-muted-foreground whitespace-pre-wrap">
        {highlightedText(text, highlightTerms)}
      </p>
    </div>
  );
}

function CriterionBreakdownTable({ breakdown }: { breakdown: EvaluativeScoringCriterionBreakdown }) {
  return (
    <div className="bg-muted/40 border-muted rounded-md border px-3 py-2 text-xs">
      <p className="text-foreground mb-1 font-medium">
        Your weight: {breakdown.userWeight}/5
        {breakdown.aiSuggestedWeight != null ? (
          <span className="text-muted-foreground font-normal">
            {" "}
            · AI suggested: {breakdown.aiSuggestedWeight}/5
          </span>
        ) : null}
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-0.5 text-left font-medium">Option</th>
            <th className="py-0.5 text-right font-medium">Your score</th>
            <th className="py-0.5 text-right font-medium">AI suggested</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.optionScores.map((o) => (
            <tr key={o.optionId} className="border-muted/60 border-t">
              <td className="py-1 pr-2">{o.optionTitle}</td>
              <td className="py-1 text-right font-medium">{o.userScore}</td>
              <td className="py-1 text-muted-foreground text-right">
                {o.aiSuggestedScore ?? "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phase 1.4 / 6.4 - structured sections + optional one-round disagree. */
export function AIPerspective({
  text,
  structured,
  exerciseId,
  perspectiveKind,
  exerciseTitle,
  domain,
  evaluativeScoringBreakdown,
  highlightTerms,
}: AIPerspectiveProps) {
  const [disagreements, setDisagreements] = useState<PerspectiveDisagreementRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listPerspectiveDisagreementsForExercise(exerciseId);
        if (!cancelled) setDisagreements(rows);
      } catch {
        if (!cancelled) setDisagreements([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const byKey = useMemo(() => {
    const sorted = [...disagreements].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const m = new Map<string, PerspectiveDisagreementRow[]>();
    for (const r of sorted) {
      const k = disagreeKey(r.section, r.pointId);
      const arr = m.get(k);
      if (arr) arr.push(r);
      else m.set(k, [r]);
    }
    return m;
  }, [disagreements]);

  const breakdownById = useMemo(() => {
    const m = new Map<string, EvaluativeScoringCriterionBreakdown>();
    for (const b of evaluativeScoringBreakdown ?? []) m.set(b.criterionId, b);
    return m;
  }, [evaluativeScoringBreakdown]);

  const refreshDisagreements = useCallback(async () => {
    try {
      const rows = await listPerspectiveDisagreementsForExercise(exerciseId);
      setDisagreements(rows);
    } catch {
      setDisagreements([]);
    }
  }, [exerciseId]);

  const clarityKind: ClarityPerspectiveKind | null =
    perspectiveKind === "analytical" ||
    perspectiveKind === "systems" ||
    perspectiveKind === "evaluative-matrix" ||
    perspectiveKind === "evaluative-scoring" ||
    perspectiveKind === "generative"
      ? perspectiveKind
      : null;

  const viewModel =
    structured && clarityKind ? getPerspectiveViewModel(structured, clarityKind) : null;

  const legacySections =
    structured && isLegacyPerspectiveStructured(structured)
      ? getStructuredPerspectiveSections(structured)
      : viewModel?.format === "legacy"
        ? viewModel.sections
        : null;

  const suitableFor = viewModel?.format === "clarity_v2" ? viewModel.suitableFor : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI perspective</CardTitle>
        {suitableFor ? (
          <p className="text-muted-foreground text-sm font-normal">{suitableFor}</p>
        ) : null}
      </CardHeader>
      <CardContent className="max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        {viewModel?.format === "clarity_v2" ? (
          <div className="text-muted-foreground space-y-6 text-sm leading-relaxed">
            <ul className="list-none space-y-0 pl-0">
              {viewModel.blocks.map((b) => {
                const dp = viewModel.disagreePoints.find(
                  (d) => d.pointId === b.id && d.section !== "openQuestionsList",
                );
                if (!dp) return null;
                const breakdown = breakdownById.get(b.id);
                return (
                  <PerspectiveDiscussRow
                    key={b.id}
                    section={dp.section}
                    pointId={dp.pointId}
                    pointTitle={dp.pointTitle}
                    pointBody={dp.pointBody}
                    exerciseId={exerciseId}
                    perspectiveKind={perspectiveKind}
                    exerciseTitle={exerciseTitle}
                    domain={domain}
                    thread={byKey.get(disagreeKey(dp.section, dp.pointId)) ?? []}
                    highlightTerms={highlightTerms}
                    onSaved={() => void refreshDisagreements()}
                  >
                    <div className="space-y-2">
                      {b.title ? <p className="text-foreground font-medium">{b.title}</p> : null}
                      {breakdown ? (
                        <CriterionBreakdownTable breakdown={breakdown} />
                      ) : b.userSnippet ? (
                        <div className="bg-muted/40 border-muted rounded-md border px-3 py-2 text-xs">
                          <span className="text-foreground font-medium">You wrote / selected: </span>
                          <span className="whitespace-pre-wrap">{b.userSnippet}</span>
                        </div>
                      ) : null}
                      <p className="whitespace-pre-wrap">{highlightedText(b.body, highlightTerms)}</p>
                      {b.remediation ? (
                        <p className="whitespace-pre-wrap">
                          <span className="text-foreground font-medium">Stronger alternative: </span>
                          {highlightedText(b.remediation, highlightTerms)}
                        </p>
                      ) : null}
                    </div>
                  </PerspectiveDiscussRow>
                );
              })}
            </ul>
            {viewModel.openQuestions.length > 0 ? (
              <div>
                <h3 className="text-foreground mb-3 font-semibold">Open questions</h3>
                <ul className="list-none space-y-0 pl-0">
                  {viewModel.openQuestions.map((q, i) => {
                    const pointId = `open_${i + 1}`;
                    const section: PerspectiveSectionKey = "openQuestionsList";
                    return (
                      <PerspectiveDiscussRow
                        key={pointId}
                        section={section}
                        pointId={pointId}
                        pointTitle={null}
                        pointBody={q}
                        exerciseId={exerciseId}
                        perspectiveKind={perspectiveKind}
                        exerciseTitle={exerciseTitle}
                        domain={domain}
                        thread={byKey.get(disagreeKey(section, pointId)) ?? []}
                        highlightTerms={highlightTerms}
                        onSaved={() => void refreshDisagreements()}
                      >
                        <p className="whitespace-pre-wrap">{highlightedText(q, highlightTerms)}</p>
                      </PerspectiveDiscussRow>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : legacySections ? (
          <div className="text-muted-foreground space-y-6 text-sm leading-relaxed">
            {legacySections.map((sec) => (
              <div key={sec.key}>
                <h3 className="text-foreground mb-3 font-semibold">{sec.title}</h3>
                <ul className="list-none space-y-0 pl-0">
                  {sec.points.map((p) => (
                    <PerspectiveDiscussRow
                      key={p.id}
                      section={sec.key}
                      pointId={p.id}
                      pointTitle={p.title?.trim() ? p.title.trim() : null}
                      pointBody={p.body}
                      exerciseId={exerciseId}
                      perspectiveKind={perspectiveKind}
                      exerciseTitle={exerciseTitle}
                      domain={domain}
                      thread={byKey.get(disagreeKey(sec.key, p.id)) ?? []}
                      highlightTerms={highlightTerms}
                      onSaved={() => void refreshDisagreements()}
                    >
                      <div className="whitespace-pre-wrap">
                        {p.title ? (
                          <>
                            <span className="text-foreground font-medium">{p.title}</span>
                            {" - "}
                          </>
                        ) : null}
                        {highlightedText(p.body, highlightTerms)}
                      </div>
                    </PerspectiveDiscussRow>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
