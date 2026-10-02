"use client";

import type { TagType } from "@/lib/types/exercise";
import { TAG_CHECK_QUESTIONS, TAG_LABELS } from "@/lib/exercise/tag-labels";

const PROBLEM_TAGS: TagType[] = ["weak_evidence", "hidden_assumption", "logical_fallacy", "bias"];

function QuestionList() {
  return (
    <ul className="space-y-1.5">
      {PROBLEM_TAGS.map((tag) => (
        <li key={tag} className="text-sm">
          <span className="text-zinc-900">{TAG_CHECK_QUESTIONS[tag]}</span>
          <span className="text-zinc-500"> - if yes: {TAG_LABELS[tag].label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The four questions to ask of each sentence. "shown" keeps them open (Guided);
 * "toggle" tucks them behind a summary the user can open (Standard).
 */
export function CheckQuestions({ mode }: { mode: "shown" | "toggle" }) {
  if (mode === "shown") {
    return (
      <div className="rounded-2xl border border-zinc-200 p-4" data-testid="check-questions">
        <p className="mb-2 text-sm font-medium text-zinc-900">Ask of each sentence:</p>
        <QuestionList />
      </div>
    );
  }
  return (
    <details className="rounded-2xl border border-zinc-200 p-4" data-testid="check-questions">
      <summary className="cursor-pointer text-sm font-medium text-zinc-900">
        Questions to ask of each sentence
      </summary>
      <div className="mt-2">
        <QuestionList />
      </div>
    </details>
  );
}
