"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RealDecisionLogEntry } from "@/lib/types/decision";
import {
  deleteDecision,
  listRecentDecisionDomains,
  putDecision,
  subscribeDecisions,
} from "@/lib/db/decisions";
import { getExercise, listRecentDomains, subscribeRecentExercisesForPicker } from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { DomainInput } from "@/components/shared/DomainInput";
import { useToast } from "@/components/ui/toast";

export default function DecisionsPage() {
  const { show: showToast } = useToast();
  const [rows, setRows] = useState<RealDecisionLogEntry[]>([]);
  const [text, setText] = useState("");
  const [domain, setDomain] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [decidedAt, setDecidedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [linkId, setLinkId] = useState<string>("");
  const [picker, setPicker] = useState<{ id: string; title: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [linkTitleById, setLinkTitleById] = useState<Record<string, string>>({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<
      string,
      {
        actualOutcome: string;
        reasoningQuality: "sound" | "flawed" | "lucky" | "unlucky" | "";
        counterfactual: string;
        thinkingPatternNote: string;
      }
    >
  >({});

  const pickerTitleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of picker) m[p.id] = p.title;
    return m;
  }, [picker]);

  useEffect(() => {
    const missing = [
      ...new Set(
        rows
          .map((r) => r.linkedExerciseId)
          .filter((id): id is string => !!id)
          .filter((id) => !pickerTitleMap[id] && !linkTitleById[id]),
      ),
    ];
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const id of missing) {
        const ex = await getExercise(id);
        if (cancelled) return;
        const title = ex?.title?.trim() ? ex.title : "Exercise";
        setLinkTitleById((prev) => ({ ...prev, [id]: title }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, pickerTitleMap, linkTitleById]);

  useEffect(() => {
    const unsubDecisions = subscribeDecisions(setRows, (error) => {
      logFirestoreQueryError("DecisionsPage", "subscribeDecisions", error);
    });
    const unsubPicker = subscribeRecentExercisesForPicker(
      30,
      (exercises) => setPicker(exercises.map((item) => ({ id: item.id, title: item.title }))),
      (error) => {
        logFirestoreQueryError("DecisionsPage", "subscribeRecentExercisesForPicker", error);
      },
    );
    return () => {
      unsubDecisions();
      unsubPicker();
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const [exDomains, decDomains] = await Promise.all([
        listRecentDomains(20),
        listRecentDecisionDomains(10),
      ]);
      const seen = new Set<string>();
      const merged: string[] = [];
      for (const d of [...exDomains, ...decDomains]) {
        if (!seen.has(d)) {
          seen.add(d);
          merged.push(d);
        }
      }
      setDomainSuggestions(merged.slice(0, 20));
    })();
  }, []);

  const add = async () => {
    const d = domain.trim();
    if (!text.trim() || !d) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const decidedDate = new Date(decidedAt + "T12:00:00");
      const remindOutcomeAt = reminderEnabled
        ? new Date(decidedDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const row: RealDecisionLogEntry = {
        id: crypto.randomUUID(),
        text: text.trim(),
        decidedAt: decidedDate.toISOString(),
        domain: d,
        linkedExerciseId: linkId || null,
        followUpNote: followUp.trim() || null,
        remindOutcomeAt,
        outcomeReminderDismissedAt: null,
        createdAt: new Date().toISOString(),
      };
      await putDecision(row);
      setText("");
      setFollowUp("");
      setLinkId("");
    } catch (e) {
      console.error("DecisionsPage putDecision (add)", e);
      setErrorMessage("Could not save this decision. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateFollowUp = async (id: string, note: string) => {
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    setErrorMessage(null);
    try {
      await putDecision({ ...cur, followUpNote: note || null });
      showToast("Saved", "success");
    } catch (e) {
      console.error("DecisionsPage putDecision (follow-up)", e);
      showToast("Save failed — try again", "error");
    }
  };

  const updateOutcomeReview = async (
    id: string,
    draft: {
      actualOutcome: string;
      reasoningQuality: "sound" | "flawed" | "lucky" | "unlucky" | "";
      counterfactual: string;
      thinkingPatternNote: string;
    },
  ) => {
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    if (!draft.actualOutcome.trim()) {
      showToast("Enter what actually happened", "error");
      return;
    }
    if (!draft.reasoningQuality) {
      showToast("Choose how your reasoning was", "error");
      return;
    }
    if (!draft.counterfactual.trim()) {
      showToast("Enter what you'd change", "error");
      return;
    }
    if (!draft.thinkingPatternNote.trim()) {
      showToast("Enter a thinking habit note", "error");
      return;
    }
    setSavingReviewId(id);
    try {
      await putDecision({
        ...cur,
        outcomeReview: {
          actualOutcome: draft.actualOutcome.trim(),
          reasoningQuality: draft.reasoningQuality,
          counterfactual: draft.counterfactual.trim(),
          thinkingPatternNote: draft.thinkingPatternNote.trim(),
        },
      });
      showToast("Saved", "success");
    } catch (e) {
      console.error("DecisionsPage putDecision (outcomeReview)", e);
      showToast("Save failed — try again", "error");
    } finally {
      setSavingReviewId(null);
    }
  };

  const removeDecision = async (id: string) => {
    setDeletingId(id);
    setErrorMessage(null);
    try {
      await deleteDecision(id);
    } catch (e) {
      console.error("DecisionsPage deleteDecision", e);
      setErrorMessage("Could not delete this entry. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      {errorMessage ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Real decisions</h1>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "inline-flex items-center justify-center",
          )}
        >
          Home
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add decision</CardTitle>
          <CardDescription>Log a real-world decision (optional link to an exercise).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="dtext">Decision</Label>
            <Textarea
              id="dtext"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <DomainInput value={domain} onChange={setDomain} suggestions={domainSuggestions} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dat">Date decided</Label>
              <Input
                id="dat"
                type="date"
                value={decidedAt}
                onChange={(e) => setDecidedAt(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Outcome reminder</Label>
            <div className="text-xs text-muted-foreground">
              Optional: set a reminder to review the outcome in 7 days.
            </div>
            <Select
              value={reminderEnabled ? "on" : "off"}
              onValueChange={(v) => setReminderEnabled(v === "on")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">
                  Set reminder 7 days after decided date
                </SelectItem>
                <SelectItem value="off">No reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Link exercise (optional)</Label>
            <Select
              value={linkId || "__none__"}
              onValueChange={(v) =>
                setLinkId(v === "__none__" || v == null ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {picker.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={saving} onClick={() => void add()}>
            {saving ? "Saving…" : "Save decision"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries yet.</p>
          ) : (
            rows.map((r) => {
              const linkId = r.linkedExerciseId;
              const linkTitle = linkId
                ? pickerTitleMap[linkId] ?? linkTitleById[linkId] ?? "Exercise"
                : null;
              const nowIso = new Date().toISOString();
              const reminderDue =
                r.remindOutcomeAt != null &&
                r.remindOutcomeAt <= nowIso &&
                (r.outcomeReminderDismissedAt == null || r.outcomeReminderDismissedAt === "");
              const reminderScheduled =
                r.remindOutcomeAt != null &&
                r.remindOutcomeAt > nowIso &&
                (r.outcomeReminderDismissedAt == null || r.outcomeReminderDismissedAt === "");

              const existing = r.outcomeReview ?? null;
              const draft =
                reviewDrafts[r.id] ??
                (existing
                  ? {
                      actualOutcome: existing.actualOutcome,
                      reasoningQuality: existing.reasoningQuality,
                      counterfactual: existing.counterfactual,
                      thinkingPatternNote: existing.thinkingPatternNote,
                    }
                  : {
                      actualOutcome: "",
                      reasoningQuality: "",
                      counterfactual: "",
                      thinkingPatternNote: "",
                    });

              return (
              <div key={r.id} className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium">{r.text}</p>
                <p className="text-muted-foreground">
                  {r.domain} · {r.decidedAt.slice(0, 10)}
                </p>
                {linkId ? (
                  <p className="text-xs">
                    <Link
                      href={`/exercise/history?openExercise=${encodeURIComponent(linkId)}`}
                      className="text-primary underline underline-offset-2"
                    >
                      Linked: {linkTitle}
                    </Link>
                  </p>
                ) : null}
                {reminderDue ? (
                  <p className="text-amber-700 dark:text-amber-300 text-xs">
                    Outcome reminder due ({r.remindOutcomeAt?.slice(0, 10)})
                  </p>
                ) : reminderScheduled ? (
                  <p className="text-muted-foreground text-xs">
                    Reminder scheduled for {r.remindOutcomeAt?.slice(0, 10)}
                  </p>
                ) : null}
                {reminderDue ? (
                  <details className="rounded-md border bg-muted/20 p-3">
                    <summary className="cursor-pointer font-medium">Review outcome</summary>
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">What actually happened?</Label>
                        <Textarea
                          rows={2}
                          value={draft.actualOutcome}
                          onChange={(e) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [r.id]: { ...draft, actualOutcome: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">How was your reasoning?</Label>
                        <Select
                          value={draft.reasoningQuality || "__unset__"}
                          onValueChange={(v) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [r.id]: {
                                ...draft,
                                reasoningQuality:
                                  v === "__unset__"
                                    ? ""
                                    : (v as "sound" | "flawed" | "lucky" | "unlucky"),
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unset__">Choose…</SelectItem>
                            <SelectItem value="sound">Sound reasoning, expected outcome</SelectItem>
                            <SelectItem value="flawed">Flawed reasoning — I missed something</SelectItem>
                            <SelectItem value="lucky">Got lucky — right outcome, wrong reasons</SelectItem>
                            <SelectItem value="unlucky">Unlucky — good reasoning, bad outcome</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">
                          With the same information you had then, what would you change?
                        </Label>
                        <Textarea
                          rows={2}
                          value={draft.counterfactual}
                          onChange={(e) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [r.id]: { ...draft, counterfactual: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Which thinking habit helped or hurt most?</Label>
                        <Textarea
                          rows={2}
                          value={draft.thinkingPatternNote}
                          onChange={(e) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [r.id]: { ...draft, thinkingPatternNote: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingReviewId === r.id}
                        onClick={() => void updateOutcomeReview(r.id, draft)}
                      >
                        {savingReviewId === r.id ? "Saving…" : "Save review"}
                      </Button>
                    </div>
                  </details>
                ) : (
                  <div className="grid gap-1">
                    <Label className="text-xs">Outcome / follow-up note</Label>
                    <Textarea
                      rows={2}
                      defaultValue={r.followUpNote ?? ""}
                      onBlur={(e) => void updateFollowUp(r.id, e.target.value)}
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={deletingId === r.id}
                  onClick={() => void removeDecision(r.id)}
                >
                  {deletingId === r.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            );
            })
          )}
        </CardContent>
      </Card>
    </main>
  );
}
