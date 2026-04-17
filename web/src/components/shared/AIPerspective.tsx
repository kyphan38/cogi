"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AIPerspectiveStructured, PerspectivePoint } from "@/lib/types/perspective";
import type { PerspectiveDisagreementRow, PerspectiveKind, PerspectiveSectionKey } from "@/lib/types/disagreement";
import { getStructuredPerspectiveSections } from "@/lib/perspective/format-structured";
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

function PerspectivePointRow(props: {
  section: PerspectiveSectionKey;
  point: PerspectivePoint;
  exerciseId: string;
  perspectiveKind: PerspectiveKind;
  exerciseTitle: string;
  domain?: string;
  existing: PerspectiveDisagreementRow | undefined;
  onSaved?: () => void;
}) {
  const { section, point, exerciseId, perspectiveKind, exerciseTitle, domain, existing, onSaved } =
    props;
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
      const res = await aiFetch("/api/ai/disagree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: perspectiveKind,
          section,
          exerciseTitle,
          domain: domain ?? "",
          pointId: point.id,
          pointTitle: point.title?.trim() ? point.title.trim() : null,
          pointBody: point.body,
          userReason: trimmed,
        }),
      });
      const data = (await res.json()) as { ok: true; text: string } | { ok: false; error: string };
      if (!data.ok) {
        setError(data.error);
        return;
      }
      const row: PerspectiveDisagreementRow = {
        id: crypto.randomUUID(),
        exerciseId,
        kind: perspectiveKind,
        section,
        pointId: point.id,
        pointTitle: point.title?.trim() ? point.title.trim() : null,
        pointBody: point.body,
        userReason: trimmed,
        aiReply: data.text,
        createdAt: new Date().toISOString(),
      };
      await putPerspectiveDisagreement(row);
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
    point.id,
    point.title,
    point.body,
    exerciseId,
    onSaved,
  ]);

  return (
    <li className="border-muted space-y-2 border-b py-3 last:border-0">
      <div className="whitespace-pre-wrap">
        {point.title ? (
          <>
            <span className="text-foreground font-medium">{point.title}</span>
            {" — "}
          </>
        ) : null}
        {point.body}
      </div>
      {localReply ? (
        <div className="bg-muted/50 rounded-md p-3 text-xs leading-relaxed">
          <p className="text-foreground mb-1 font-medium">AI reply to your disagreement</p>
          <p className="text-muted-foreground whitespace-pre-wrap">{localReply}</p>
        </div>
      ) : open ? (
        <div className="grid max-w-xl gap-2">
          <Label htmlFor={`dis-${section}-${point.id}`}>Why do you disagree?</Label>
          <Textarea
            id={`dis-${section}-${point.id}`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain your reasoning…"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={loading} onClick={() => void submit()}>
              {loading ? "Sending…" : "Submit"}
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

/** Phase 1.4 / 6.4 — structured sections + optional one-round disagree. */
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

  const sections = structured ? getStructuredPerspectiveSections(structured) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI perspective</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        {sections ? (
          <div className="text-muted-foreground space-y-6 text-sm leading-relaxed">
            {sections.map((sec) => (
              <div key={sec.key}>
                <h3 className="text-foreground mb-3 font-semibold">{sec.title}</h3>
                <ul className="list-none space-y-0 pl-0">
                  {sec.points.map((p) => (
                    <PerspectivePointRow
                      key={p.id}
                      section={sec.key}
                      point={p}
                      exerciseId={exerciseId}
                      perspectiveKind={perspectiveKind}
                      exerciseTitle={exerciseTitle}
                      domain={domain}
                      existing={byKey.get(disagreeKey(sec.key, p.id))}
                      onSaved={() => void refreshDisagreements()}
                    />
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
