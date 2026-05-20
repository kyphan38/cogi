"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import { isLegacyPerspectiveStructured } from "@/lib/types/perspective";
import type { PerspectiveDisagreementRow, PerspectiveKind, PerspectiveSectionKey } from "@/lib/types/disagreement";
import {
  getPerspectiveViewModel,
  getStructuredPerspectiveSections,
} from "@/lib/perspective/format-structured";
import { aiFetch } from "@/lib/api/ai-fetch";
import {
  listPerspectiveDisagreementsForExercise,
  putPerspectiveDisagreement,
} from "@/lib/db/disagreements";

export interface AIPerspectiveProps {
  text: string;
  structured?: AIPerspectiveStructured | null;
  exerciseId: string;
  perspectiveKind: PerspectiveKind;
  exerciseTitle: string;
  domain?: string;
}

function disagreeKey(section: PerspectiveSectionKey, pointId: string) {
  return `${section}:${pointId}`;
}

function PerspectiveDisagreeRow(props: {
  section: PerspectiveSectionKey;
  pointId: string;
  pointTitle: string | null;
  pointBody: string;
  exerciseId: string;
  perspectiveKind: PerspectiveKind;
  exerciseTitle: string;
  domain?: string;
  existing: PerspectiveDisagreementRow | undefined;
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
    existing,
    onSaved,
    children,
  } = props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localReply, setLocalReply] = useState<string | null>(existing?.aiReply ?? null);

  useEffect(() => {
    setLocalReply(existing?.aiReply ?? null);
  }, [existing?.aiReply]);

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
      const data = (await res.json()) as
        | {
            ok: true;
            text: string;
            saved?: { saved: true; id: string; path: string; savedAt: string };
          }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(data.error);
        return;
      }
      if (!data.saved?.saved) {
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
        await putPerspectiveDisagreement(row);
      }
      setLocalReply(data.text);
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
      {localReply ? (
        <DisagreeReply text={localReply} />
      ) : open ? (
        <div className="grid max-w-xl gap-2">
          <Label htmlFor={`dis-${section}-${pointId}`}>Why do you disagree?</Label>
          <Textarea
            id={`dis-${section}-${pointId}`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain your reasoning…"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={loading} onClick={() => void submit()}>
              {loading ? (
                <>
                  <InlineSpinner /> Sending…
                </>
              ) : (
                "Submit"
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
          I disagree
        </Button>
      )}
    </li>
  );
}

function DisagreeReply({ text }: { text: string }) {
  return (
    <div className="bg-muted/50 rounded-md p-3 text-xs leading-relaxed">
      <p className="text-foreground mb-1 font-medium">AI reply to your disagreement</p>
      <p className="text-muted-foreground whitespace-pre-wrap">{text}</p>
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
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const m = new Map<string, PerspectiveDisagreementRow>();
    for (const r of sorted) {
      const k = disagreeKey(r.section, r.pointId);
      if (!m.has(k)) m.set(k, r);
    }
    return m;
  }, [disagreements]);

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
                return (
                  <PerspectiveDisagreeRow
                    key={b.id}
                    section={dp.section}
                    pointId={dp.pointId}
                    pointTitle={dp.pointTitle}
                    pointBody={dp.pointBody}
                    exerciseId={exerciseId}
                    perspectiveKind={perspectiveKind}
                    exerciseTitle={exerciseTitle}
                    domain={domain}
                    existing={byKey.get(disagreeKey(dp.section, dp.pointId))}
                    onSaved={() => void refreshDisagreements()}
                  >
                    <div className="space-y-2">
                      {b.title ? <p className="text-foreground font-medium">{b.title}</p> : null}
                      {b.userSnippet ? (
                        <div className="bg-muted/40 border-muted rounded-md border px-3 py-2 text-xs">
                          <span className="text-foreground font-medium">You wrote / selected: </span>
                          <span className="whitespace-pre-wrap">{b.userSnippet}</span>
                        </div>
                      ) : null}
                      <p className="whitespace-pre-wrap">{b.body}</p>
                      {b.remediation ? (
                        <p className="whitespace-pre-wrap">
                          <span className="text-foreground font-medium">Stronger alternative: </span>
                          {b.remediation}
                        </p>
                      ) : null}
                    </div>
                  </PerspectiveDisagreeRow>
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
                      <PerspectiveDisagreeRow
                        key={pointId}
                        section={section}
                        pointId={pointId}
                        pointTitle={null}
                        pointBody={q}
                        exerciseId={exerciseId}
                        perspectiveKind={perspectiveKind}
                        exerciseTitle={exerciseTitle}
                        domain={domain}
                        existing={byKey.get(disagreeKey(section, pointId))}
                        onSaved={() => void refreshDisagreements()}
                      >
                        <p className="whitespace-pre-wrap">{q}</p>
                      </PerspectiveDisagreeRow>
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
                    <PerspectiveDisagreeRow
                      key={p.id}
                      section={sec.key}
                      pointId={p.id}
                      pointTitle={p.title?.trim() ? p.title.trim() : null}
                      pointBody={p.body}
                      exerciseId={exerciseId}
                      perspectiveKind={perspectiveKind}
                      exerciseTitle={exerciseTitle}
                      domain={domain}
                      existing={byKey.get(disagreeKey(sec.key, p.id))}
                      onSaved={() => void refreshDisagreements()}
                    >
                      <div className="whitespace-pre-wrap">
                        {p.title ? (
                          <>
                            <span className="text-foreground font-medium">{p.title}</span>
                            {" - "}
                          </>
                        ) : null}
                        {p.body}
                      </div>
                    </PerspectiveDisagreeRow>
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
