"use client";

import type { ReactNode } from "react";
import type { TakeWithYouGuide, TrapCardAi } from "@/lib/exercise/take-with-you";

export interface TakeWithYouEntry {
  key: string;
  name: string;
  guide: TakeWithYouGuide;
  /** Overrides some headings for this card only. */
  labels?: Partial<TakeWithYouLabels>;
}

/** Headings that differ by exercise: a thought trap is "you", a reasoning issue is what you read. */
export interface TakeWithYouLabels {
  self: string;
  elsewhere: string;
  balanced: string;
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-foreground font-medium">{title}</p>
      <div className="text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

function CardBody({ g, ai, labels }: { g: TakeWithYouGuide; ai?: TrapCardAi; labels: TakeWithYouLabels }) {
  return (
    <div className="space-y-3 pt-2">
      <Part title="Spot it">
        <p>{g.spot}</p>
        <p>Words to notice: {g.signals.map((s) => `"${s}"`).join(", ")}</p>
      </Part>
      <Part title={labels.self}>
        <p>
          Ask: <span className="text-foreground">{g.ask}</span>
        </p>
        <p>Then: {g.fix}</p>
      </Part>
      <Part title="When it's someone else">
        {ai ? (
          <p>
            They say: <span className="italic">&ldquo;{ai.othersSay}&rdquo;</span>
            <br />
            You could say: <span className="text-foreground italic">&ldquo;{ai.youCouldSay}&rdquo;</span>
          </p>
        ) : null}
        <p>{g.othersTip}</p>
      </Part>
      {ai?.elsewhere.thought ? (
        <Part title={`${labels.elsewhere}: ${ai.elsewhere.area}`}>
          <p>
            <span className="italic">&ldquo;{ai.elsewhere.thought}&rdquo;</span>
            <br />
            {labels.balanced}: <span className="text-foreground italic">&ldquo;{ai.elsewhere.balanced}&rdquo;</span>
          </p>
        </Part>
      ) : null}
      <Part title="Try this week">
        <p>{g.practice}</p>
      </Part>
    </div>
  );
}

/**
 * "Take with you": 1-2 cards (picked in code) for real life. The fixed guide is always
 * shown; the AI's examples are added when they passed the checks. The first card is
 * open, the rest fold away to keep the answer key short.
 */
export function TakeWithYouCards({
  entries,
  cards,
  labels,
}: {
  entries: TakeWithYouEntry[];
  cards?: TrapCardAi[];
  labels: TakeWithYouLabels;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="space-y-2" data-testid="take-with-you-cards">
      <h3 className="text-foreground font-semibold">Take with you</h3>
      {entries.map((e, i) => (
        <details key={e.key} open={i === 0} className="border-muted rounded-xl border px-3 py-2" data-testid="trap-card">
          <summary className="text-foreground cursor-pointer font-medium">{e.name}</summary>
          <CardBody g={e.guide} ai={cards?.find((c) => c.trap === e.key)} labels={{ ...labels, ...e.labels }} />
        </details>
      ))}
    </section>
  );
}
