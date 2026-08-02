"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getScenarioById } from "@/lib/scenarios";
import { loadDraftScenario, saveDraftScenario } from "@/lib/scenarios/draft-session-cache";
import type { LoopState, Scenario } from "@/lib/types/math-scenario";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import type { ActiveMathSession, MathSessionMessage } from "@/lib/types/math-session";
import { putConfidenceRecord } from "@/lib/db/confidence";
import { recordPracticedTopic } from "@/lib/db/practiced-topics";
import {
  deleteActiveMathSession,
  getActiveMathSession,
  putActiveMathSession,
} from "@/lib/db/math-sessions";
import { StepDrop } from "@/components/math/StepDrop";
import { StepCommit } from "@/components/math/StepCommit";
import { StepStruggle, type StepStruggleMessage } from "@/components/math/StepStruggle";
import { StepReveal } from "@/components/math/StepReveal";
import { StepTeachBack, type StepTeachBackMessage } from "@/components/math/StepTeachBack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CommittedData = {
  committedValue: string | number;
  predictionText?: string;
  confidence: number; // 0.00 to 1.00
  correct: boolean;
};

export default function MathScenarioRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const catalogScenario = getScenarioById(id);
  const [draftScenario] = useState(() => (catalogScenario ? null : loadDraftScenario(id)));

  const [scenario, setScenario] = useState<Scenario | undefined>(
    catalogScenario ?? draftScenario ?? undefined,
  );
  const isAiDraft = !catalogScenario;

  const [loopState, setLoopState] = useState<LoopState>("drop");
  const [committedData, setCommittedData] = useState<CommittedData | null>(null);
  const [struggleMessages, setStruggleMessages] = useState<StepStruggleMessage[] | undefined>(undefined);
  const [teachBackMessages, setTeachBackMessages] = useState<StepTeachBackMessage[] | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const createdAtRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getActiveMathSession(id)
      .then((session) => {
        if (cancelled) return;
        createdAtRef.current = session?.createdAt ?? new Date().toISOString();
        if (session) {
          if (!scenario && session.scenarioSnapshot) {
            setScenario(session.scenarioSnapshot);
            saveDraftScenario(session.scenarioSnapshot);
          }
          setLoopState(session.loopState);
          setCommittedData(session.committedData);
          if (session.struggleMessages.length > 0) {
            setStruggleMessages(session.struggleMessages as StepStruggleMessage[]);
          }
          if (session.teachBackMessages.length > 0) {
            setTeachBackMessages(session.teachBackMessages as StepTeachBackMessage[]);
          }
        }
      })
      .catch(() => {
        // Degrade gracefully - no persisted session just means starting fresh.
        createdAtRef.current = new Date().toISOString();
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!hydrated || !scenario || loopState === "complete") return;
    const timer = setTimeout(() => {
      const row: ActiveMathSession = {
        id: scenario.id,
        topic: scenario.topic,
        title: scenario.title,
        isAiDraft,
        scenarioSnapshot: isAiDraft ? scenario : undefined,
        loopState,
        committedData,
        struggleMessages: (struggleMessages ?? []) as MathSessionMessage[],
        teachBackMessages: (teachBackMessages ?? []) as MathSessionMessage[],
        createdAt: createdAtRef.current ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      void putActiveMathSession(row).catch(() => {
        // Session persistence is best-effort - a failure shouldn't block practicing.
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [hydrated, scenario, isAiDraft, loopState, committedData, struggleMessages, teachBackMessages]);

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      </main>
    );
  }

  if (!scenario) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4 py-12 text-center sm:p-6">
        <h1 className="text-xl font-semibold">Scenario not found</h1>
        <p className="text-muted-foreground text-sm">
          The scenario ID &ldquo;{id}&rdquo; does not exist in the catalog, and no matching AI
          draft was found.
        </p>
        <Link href="/math">
          <Button variant="outline">← Return to scenarios</Button>
        </Link>
      </main>
    );
  }

  const stepsList: Array<{ key: LoopState; label: string }> = [
    { key: "drop", label: "1. Drop" },
    { key: "commit", label: "2. Commit" },
    { key: "struggle", label: "3. Struggle" },
    { key: "reveal_answer", label: "4. Reveal" },
    { key: "teach_back", label: "5. Teach-Back" },
  ];

  const currentStepIndex =
    loopState === "drop"
      ? 0
      : loopState === "commit"
      ? 1
      : loopState === "struggle"
      ? 2
      : loopState.startsWith("reveal")
      ? 3
      : loopState === "teach_back"
      ? 4
      : 5;

  const handleCommitSubmit = (data: CommittedData) => {
    setCommittedData(data);
    setLoopState("reveal_answer");
  };

  const handleCompleteScenario = async () => {
    if (committedData && !isAiDraft) {
      const confPct = Math.round(committedData.confidence * 100);
      const accPct = committedData.correct ? 100 : 0;
      const record: ConfidenceRecord = {
        id: crypto.randomUUID(),
        exerciseId: scenario.id,
        confidenceBefore: confPct,
        actualAccuracy: accPct,
        gap: confPct - accPct,
        createdAt: new Date().toISOString(),
      };
      try {
        await putConfidenceRecord(record);
      } catch {
        // Safe local fallback
      }
    }
    try {
      await recordPracticedTopic({
        area: scenario.topic,
        title: scenario.title,
        origin: isAiDraft ? "suggested" : "manual",
      });
    } catch {
      // Safe local fallback - exclusion is a nice-to-have, not required for completion.
    }
    try {
      await deleteActiveMathSession(scenario.id);
    } catch {
      // Safe local fallback - a leftover session doc is harmless (won't reopen once complete).
    }
    setLoopState("complete");
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header & Step Indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/math"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
          >
            ← Back to catalog
          </Link>
          <div className="flex items-center gap-2">
            {isAiDraft ? <Badge variant="attention">AI draft - unverified</Badge> : null}
            <Badge variant="secondary" className="uppercase tracking-wide">
              {scenario.topic.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
        {isAiDraft ? (
          <p className="text-muted-foreground text-xs">
            Practice only - not scored, not added to your calibration history.
          </p>
        ) : null}

        {/* Stepper Bar */}
        <div className="grid grid-cols-5 gap-2">
          {stepsList.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <div
                key={step.key}
                className={cn(
                  "rounded-lg border py-2 text-center text-xs font-medium transition-colors",
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : isCompleted
                      ? "border-border bg-muted text-foreground"
                      : "border-border bg-transparent text-muted-foreground",
                )}
              >
                {step.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Renderers */}
      {loopState === "drop" && (
        <StepDrop
          scenario={scenario}
          onProceed={() => setLoopState("commit")}
        />
      )}

      {loopState === "commit" && (
        <StepCommit
          scenario={scenario}
          onCommit={handleCommitSubmit}
          onStruggle={() => setLoopState("struggle")}
        />
      )}

      {loopState === "struggle" && (
        <StepStruggle
          scenario={scenario}
          onProceedToCommit={() => setLoopState("commit")}
          initialMessages={struggleMessages}
          onMessagesChange={setStruggleMessages}
        />
      )}

      {loopState.startsWith("reveal") && (
        <StepReveal
          scenario={scenario}
          isCorrect={committedData?.correct ?? false}
          onProceedToTeachBack={() => setLoopState("teach_back")}
        />
      )}

      {loopState === "teach_back" && (
        <StepTeachBack
          scenario={scenario}
          onComplete={handleCompleteScenario}
          initialMessages={teachBackMessages}
          onMessagesChange={setTeachBackMessages}
        />
      )}

      {loopState === "complete" && (
        <Card className="items-center space-y-5 p-8 text-center">
          <div className="border-border bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full border text-2xl font-semibold">
            ✓
          </div>
          <h2 className="text-xl font-semibold">Scenario complete!</h2>
          <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
            {isAiDraft
              ? "This was unscored practice - nothing was added to your calibration history."
              : "Your prediction & confidence score have been logged into your calibration history."}
          </p>

          <div className="flex justify-center pt-2">
            <Button onClick={() => router.push("/math")} size="lg">
              Return to catalog
            </Button>
          </div>
        </Card>
      )}
    </main>
  );
}
