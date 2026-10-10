"use client";

import type { ReactNode } from "react";
import type { ReframeTag } from "@/lib/ai/validators/reframe";
import { REFRAME_TAG_INFO } from "@/lib/exercise/reframe-levels";
import { REFRAME_TRAP_GUIDE } from "@/lib/exercise/reframe-trap-guide";
import type { TrapCardAi } from "@/lib/exercise/reframe-trap-cards";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-foreground font-medium">{title}</p>
      <div className="text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

function TrapCardBody({ trap, ai }: { trap: ReframeTag; ai?: TrapCardAi }) {
  const g = REFRAME_TRAP_GUIDE[trap];
  return (
    <div className="space-y-3 pt-2">
      <Part title="Spot it">
        <p>{g.spot}</p>
        <p>Words to notice: {g.signals.map((s) => `"${s}"`).join(", ")}</p>
      </Part>
      <Part title="When it's you">
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
        <Part title={`Same trap, other place: ${ai.elsewhere.area}`}>
          <p>
            <span className="italic">&ldquo;{ai.elsewhere.thought}&rdquo;</span>
            <br />
            Balanced: <span className="text-foreground italic">&ldquo;{ai.elsewhere.balanced}&rdquo;</span>
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
 * "Take with you" for Reframe: 1-2 traps (picked in code) as cards for real life. The
 * fixed guide is always shown; the AI's examples are added when they passed the checks.
 * The first card is open, the rest fold away to keep the answer key short.
 */
export function ReframeTrapCards({ traps, cards }: { traps: ReframeTag[]; cards?: TrapCardAi[] }) {
  if (traps.length === 0) return null;
  return (
    <section className="space-y-2" data-testid="reframe-trap-cards">
      <h3 className="text-foreground font-semibold">Take with you</h3>
      {traps.map((trap, i) => (
        <details key={trap} open={i === 0} className="border-muted rounded-xl border px-3 py-2" data-testid="trap-card">
          <summary className="text-foreground cursor-pointer font-medium">{REFRAME_TAG_INFO[trap].name}</summary>
          <TrapCardBody trap={trap} ai={cards?.find((c) => c.trap === trap)} />
        </details>
      ))}
    </section>
  );
}
