"use client";

import Link from "next/link";

import { Section } from "@/components/shared/Section";
import { localDay, reviewCounts } from "@/lib/geo/quiz";
import { quizAttempts, quizDoneOn } from "@/lib/geo/rows";
import type { Exercise } from "@/lib/types/exercise";

function quizStatus(completed: Exercise[]): { line: string; ready: boolean } {
  const today = localDay(new Date());
  if (quizDoneOn(completed, today)) return { line: "Today's map quiz is done.", ready: false };
  const { due } = reviewCounts(quizAttempts(completed), today);
  return {
    line:
      due > 0
        ? `Today's map quiz is ready, with ${due} ${due === 1 ? "place" : "places"} to review.`
        : "Today's map quiz is ready.",
    ready: true,
  };
}

const ROW =
  "group/row flex min-w-0 items-center justify-between gap-4 border-t border-border py-3 transition-colors";
const GO = "shrink-0 text-sm text-muted-foreground transition-colors after:ml-1 after:content-['›'] group-hover/row:text-foreground";

/** Today page: the tools under Explore, one row each (PLAN-refine R5). */
export function HomeExplore({ completed }: { completed: Exercise[] | null }) {
  const quiz = completed ? quizStatus(completed) : null;
  return (
    <Section title="Explore">
      <div className="border-b border-border">
        <Link href="/geo" className={ROW} data-testid="geo-lab-link">
          <div className="min-w-0" data-testid="geo-lab-card">
            <p className="text-body">Daily map quiz</p>
            {quiz ? (
              <p className="text-meta text-muted-foreground" data-testid="geo-lab-card-status">
                {quiz.line}
              </p>
            ) : null}
          </div>
          <span className={quiz?.ready ? `${GO} font-medium text-foreground` : GO}>{quiz?.ready ? "ready" : "Open"}</span>
        </Link>
        <Link href="/simulators" className={ROW}>
          <div className="min-w-0">
            <p className="text-body">Simulators</p>
            <p className="text-meta text-muted-foreground">Loans, savings and import prices.</p>
          </div>
          <span className={GO}>Open</span>
        </Link>
        <Link href="/tracks" className={ROW}>
          <div className="min-w-0">
            <p className="text-body">All tracks</p>
            <p className="text-meta text-muted-foreground">One step a day, in order.</p>
          </div>
          <span className={GO}>Open</span>
        </Link>
      </div>
    </Section>
  );
}
