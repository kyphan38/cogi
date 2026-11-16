"use client";

import Link from "next/link";

import { Section } from "@/components/shared/Section";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { weakSpotHref, weakSpots } from "@/lib/exercise/weak-spots";
import type { Exercise } from "@/lib/types/exercise";

/** Today: the few mistakes made most often, each with a way to practise it. */
export function WeakSpots({ completed }: { completed: Exercise[] }) {
  const spots = weakSpots(completed);
  if (spots.length === 0) return null;
  return (
    <Section title="Your weak spots" data-testid="weak-spots">
      <div className="border-b border-border">
        {spots.map((s) => (
          <Link
            key={s.key}
            href={weakSpotHref(s)}
            className="group/row flex min-w-0 items-center justify-between gap-4 border-t border-border py-3"
            data-testid="weak-spot"
          >
            <div className="min-w-0">
              <p className="truncate text-body">{s.label}</p>
              <p className="text-meta text-muted-foreground tabular-nums">
                {TYPE_LABEL[s.type]} · missed {s.misses} of {s.chances}
              </p>
            </div>
            <span className="shrink-0 text-body text-muted-foreground transition-colors after:ml-1 after:content-['›'] group-hover/row:text-foreground">
              practice this
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
