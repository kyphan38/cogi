"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SpokenAnswer } from "@/components/quick/useSpeakRecorder";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { listCompletedExercises, putExercise } from "@/lib/db/exercises";
import { getUserContext } from "@/lib/db/settings";
import { quickSkillFor, type QuickFeedback, type QuickQuestion } from "@/lib/quick/schema";
import { localDay } from "@/lib/review/schedule";
import type { QuickExerciseRow } from "@/lib/types/exercise";

/** An unanswered question survives a reload, so opening the page twice costs one AI call. */
const DRAFT_KEY = "cogi:quick-question";
type Draft = { day: string; skill: string; question: QuickQuestion };

function readDraft(day: string): Draft | null {
  try {
    const d = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
    return d && d.day === day ? d : null;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft | null): void {
  try {
    if (d) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Only a convenience.
  }
}

const post = async <T,>(body: Record<string, unknown>): Promise<T> =>
  safeAiJson<T>(await aiFetch("/api/ai/quick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

type FeedbackReply = { ok: true; feedback: QuickFeedback; transcript?: string; delivery?: QuickExerciseRow["delivery"] } | { ok: false; error: string };

/** The 5-minute question: load one, send a typed or spoken answer, save the finished row. */
export function useQuickQuestion() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<QuickExerciseRow | null>(null);
  const startedAt = useRef(new Date().toISOString());
  // Only the newest load may set state: an older one that ends later must not bring back its error.
  const loadId = useRef(0);

  const load = useCallback(async (fresh: boolean) => {
    const id = ++loadId.current;
    const day = localDay(new Date());
    const saved = fresh ? null : readDraft(day);
    setDone(null);
    setError(null);
    if (saved) {
      setDraft(saved);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [userContext, recent] = await Promise.all([getUserContext(), listCompletedExercises({ type: "quick" }, 60).catch(() => [])]);
      const skill = quickSkillFor(day);
      const json = await post<{ ok: true; question: QuickQuestion } | { ok: false; error: string }>({
        action: "question",
        skill,
        userContext: userContext || undefined,
        avoid: recent.map((r) => r.title).slice(0, 12),
      });
      if (!json.ok) throw new Error(json.error);
      if (id !== loadId.current) return;
      const next = { day, skill, question: json.question };
      startedAt.current = new Date().toISOString();
      writeDraft(next);
      setDraft(next);
    } catch (e) {
      if (id !== loadId.current) return;
      setDraft(null);
      setError(e instanceof Error ? e.message : "Could not load a question.");
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads once on mount
    void load(false);
  }, [load]);

  const finish = async (answer: { text: string } | { spoken: SpokenAnswer }) => {
    if (!draft || sending) return;
    setSending(true);
    setError(null);
    try {
      const { scenario, question } = draft.question;
      const json = await post<FeedbackReply>(
        "text" in answer
          ? { action: "feedback", scenario, question, answer: answer.text.trim() }
          : { action: "spoken", scenario, question, audio: answer.spoken.base64, mimeType: answer.spoken.mimeType },
      );
      if (!json.ok) throw new Error(json.error);
      const spoken = "spoken" in answer;
      const row: QuickExerciseRow = {
        id: crypto.randomUUID(),
        type: "quick",
        domain: "5-minute question",
        title: draft.question.title,
        scenario,
        question,
        skill: draft.skill,
        answer: spoken ? (json.transcript ?? "") : answer.text.trim(),
        spoken,
        feedback: json.feedback,
        delivery: spoken ? (json.delivery ?? null) : null,
        confidenceBefore: null,
        aiPerspective: null,
        createdAt: startedAt.current,
        completedAt: new Date().toISOString(),
      };
      await putExercise(row);
      writeDraft(null);
      setDone(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get feedback.");
    } finally {
      setSending(false);
    }
  };

  return { question: draft?.question ?? null, loading, sending, error, done, another: () => void load(true), finish };
}
