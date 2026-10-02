"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalyticalExerciseRow, TagType, UserHighlight } from "@/lib/types/exercise";
import { TAG_CHECK_QUESTIONS, TAG_LABELS } from "@/lib/exercise/tag-labels";
import { guidedCandidates, shuffledOrder } from "@/lib/exercise/guided-candidates";
import type { TextRange } from "@/lib/text/sentences";
import { CheckQuestions } from "@/components/exercises/CheckQuestions";

const PROBLEM_TAGS: TagType[] = ["weak_evidence", "hidden_assumption", "logical_fallacy", "bias"];

type WalkExercise = Pick<
  AnalyticalExerciseRow,
  "id" | "passage" | "embeddedIssues" | "validPoints" | "mainClaimQuiz" | "mainClaimAnswer" | "guidedIndex"
>;

export type GuidedPart = "main-claim" | "sentences" | "done";

export function guidedCandidatesFor(ex: WalkExercise): TextRange[] {
  return guidedCandidates({
    passage: ex.passage,
    embeddedIssues: ex.embeddedIssues,
    validPoints: ex.validPoints,
    seed: ex.id,
  });
}

/** Which part of the walkthrough the user is on (rows without a quiz skip it). */
export function guidedPart(ex: WalkExercise, candidateCount: number): GuidedPart {
  if (ex.mainClaimQuiz && ex.mainClaimAnswer == null) return "main-claim";
  return (ex.guidedIndex ?? 0) >= candidateCount ? "done" : "sentences";
}

function overlaps(a: TextRange, h: UserHighlight): boolean {
  return Math.max(a.start, h.startOffset) < Math.min(a.end, h.endOffset);
}

const CHOICE_LABELS: Record<string, string> = {
  valid_point: "Looks fine",
  unclear: "Not sure",
};

function choiceLabel(tag: TagType): string {
  return CHOICE_LABELS[tag] ?? `Problem: ${TAG_LABELS[tag].label}`;
}

function MainClaimStep({
  ex,
  onAnswered,
}: {
  ex: WalkExercise;
  onAnswered: (index: number) => void;
}) {
  const quiz = ex.mainClaimQuiz!;
  const order = useMemo(() => shuffledOrder(quiz.options.length, ex.id), [quiz.options.length, ex.id]);
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === quiz.answerIndex;

  return (
    <div className="space-y-4" data-testid="main-claim-step">
      <div>
        <p className="font-medium text-zinc-900">First, read the passage. What is its main claim?</p>
        <p className="text-muted-foreground text-sm">
          Knowing what the writer wants you to believe makes the weak spots easier to see.
        </p>
      </div>
      <div className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900">
        {ex.passage}
      </div>
      <div className="grid gap-2" role="radiogroup" aria-label="Main claim">
        {order.map((i) => {
          const isPicked = picked === i;
          const isAnswer = picked != null && i === quiz.answerIndex;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={picked != null}
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default",
                isAnswer
                  ? "border-zinc-900 bg-zinc-50"
                  : isPicked
                    ? "border-zinc-400 bg-white"
                    : "border-zinc-200 bg-white hover:bg-zinc-50",
              )}
            >
              {isAnswer ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
              {isPicked && !isAnswer ? <X className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
              <span>{quiz.options[i]}</span>
            </button>
          );
        })}
      </div>
      {picked != null ? (
        <div className="space-y-3" data-testid="main-claim-feedback">
          <p className="text-sm">
            <span className="font-medium">{correct ? "Right. " : "Not quite. "}</span>
            {quiz.explanation}
          </p>
          <Button type="button" onClick={() => onAnswered(picked)}>
            Next: check the sentences
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Guided level: a main-claim check, then the suggested sentences one at a time. Each
 * answer becomes a normal highlight on that sentence, so scoring and feedback work
 * the same as at the other levels.
 */
export function GuidedWalkthrough({
  ex,
  highlights,
  onProgress,
}: {
  ex: WalkExercise;
  highlights: UserHighlight[];
  /** Save progress; `nextHighlights` is set when the step also recorded an answer. */
  onProgress: (
    patch: { mainClaimAnswer?: number; guidedIndex?: number },
    nextHighlights?: UserHighlight[],
  ) => void;
}) {
  const candidates = useMemo(() => guidedCandidatesFor(ex), [ex]);
  const part = guidedPart(ex, candidates.length);
  const index = Math.min(ex.guidedIndex ?? 0, candidates.length);
  const [askingTag, setAskingTag] = useState(false);

  if (part === "main-claim") {
    return <MainClaimStep ex={ex} onAnswered={(i) => onProgress({ mainClaimAnswer: i })} />;
  }

  const current = candidates[index];
  const answerFor = (r: TextRange) => highlights.find((h) => overlaps(r, h)) ?? null;
  const currentAnswer = current ? answerFor(current) : null;

  const goTo = (i: number) => {
    setAskingTag(false);
    onProgress({ guidedIndex: Math.max(0, Math.min(i, candidates.length)) });
  };

  const answer = (tag: TagType) => {
    if (!current) return;
    setAskingTag(false);
    onProgress({ guidedIndex: Math.min(index + 1, candidates.length) }, [
      ...highlights.filter((h) => !overlaps(current, h)),
      {
        id: crypto.randomUUID(),
        startOffset: current.start,
        endOffset: current.end,
        text: ex.passage.slice(current.start, current.end),
        tag,
      },
    ]);
  };

  const flagged = candidates.filter((c) => {
    const a = answerFor(c);
    return a != null && a.tag !== "valid_point" && a.tag !== "unclear";
  }).length;

  // Passage with the suggested sentences underlined and the current one shaded.
  const pieces: { text: string; candidate: number | null }[] = [];
  let at = 0;
  candidates.forEach((c, i) => {
    if (c.start > at) pieces.push({ text: ex.passage.slice(at, c.start), candidate: null });
    pieces.push({ text: ex.passage.slice(c.start, c.end), candidate: i });
    at = c.end;
  });
  if (at < ex.passage.length) pieces.push({ text: ex.passage.slice(at), candidate: null });

  return (
    <div className="space-y-4" data-testid="guided-walkthrough">
      <p className="text-sm text-zinc-900">
        This passage has <span className="font-medium">{ex.embeddedIssues.length} issues</span> and{" "}
        <span className="font-medium">{ex.validPoints.length} traps</span> (sound statements that only
        look suspicious). Check the {candidates.length} underlined sentences one by one.
      </p>
      <CheckQuestions mode="shown" />
      <div
        data-testid="text-passage"
        className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900"
      >
        {pieces.map((p, i) => {
          if (p.candidate == null) return <span key={i} className="text-zinc-500">{p.text}</span>;
          const c = candidates[p.candidate]!;
          const a = answerFor(c);
          // A span, not a button: buttons break the line and split the paragraph.
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              data-testid="guided-sentence"
              aria-current={p.candidate === index ? "step" : undefined}
              onClick={() => goTo(p.candidate!)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goTo(p.candidate!);
                }
              }}
              className={cn(
                "cursor-pointer rounded-sm underline decoration-dotted decoration-zinc-400 underline-offset-4 focus-visible:outline-2 focus-visible:outline-zinc-900",
                p.candidate === index && "bg-zinc-900/10 decoration-zinc-900 decoration-solid",
                a && p.candidate !== index && "decoration-zinc-900 decoration-solid",
              )}
            >
              {p.text}
            </span>
          );
        })}
      </div>

      {current ? (
        <div className="space-y-3 rounded-2xl border border-zinc-200 p-4" data-testid="guided-current">
          <p className="text-muted-foreground text-xs">
            Sentence {index + 1} of {candidates.length}
            {currentAnswer ? ` · your answer: ${choiceLabel(currentAnswer.tag)}` : ""}
          </p>
          <p className="italic text-zinc-900">&ldquo;{ex.passage.slice(current.start, current.end)}&rdquo;</p>
          {askingTag ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Which question gets a yes?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROBLEM_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => answer(tag)}
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm hover:bg-zinc-50"
                  >
                    <span className="font-medium">{TAG_LABELS[tag].label}</span>
                    <span className="text-xs text-zinc-500">{TAG_CHECK_QUESTIONS[tag]}</span>
                  </button>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAskingTag(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setAskingTag(true)}>
                Has a problem
              </Button>
              <Button type="button" variant="secondary" onClick={() => answer("valid_point")}>
                Looks fine
              </Button>
              <Button type="button" variant="secondary" onClick={() => answer("unclear")}>
                Not sure
              </Button>
              {index > 0 ? (
                <Button type="button" variant="ghost" onClick={() => goTo(index - 1)}>
                  Previous
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-zinc-200 p-4" data-testid="guided-done">
          <p className="text-sm">
            All {candidates.length} sentences checked. You marked {flagged} as having a problem.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => goTo(0)}>
            Review my answers
          </Button>
        </div>
      )}
    </div>
  );
}
