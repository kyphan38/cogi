"use client";

import type { ReactNode } from "react";
import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticalCoachingItem, AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";

/** Building blocks shared by the answer keys of all exercise types (monochrome). */

export type Status = "right" | "partly" | "wrong" | "neutral";

export function StatusIcon({ status }: { status: Status }) {
  const Icon = status === "wrong" ? X : status === "neutral" ? Minus : Check;
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0", status === "neutral" ? "text-muted-foreground" : "text-foreground")}
      strokeWidth={status === "right" ? 2.5 : 2}
    />
  );
}

export function Marker({ children }: { children: ReactNode }) {
  return (
    <span className="border-foreground/30 text-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border px-1 text-[11px] font-medium tabular-nums">
      {children}
    </span>
  );
}

export function Coaching({ item, fallback }: { item?: AnalyticalCoachingItem; fallback: string }) {
  if (!item) return fallback ? <p className="text-muted-foreground">{fallback}</p> : null;
  return (
    <div className="space-y-1">
      <p>{item.why}</p>
      <p className="text-muted-foreground">
        <span className="text-foreground font-medium">Clue: </span>
        {item.clue}
      </p>
      <p className="text-muted-foreground">
        <span className="text-foreground font-medium">Next time, ask: </span>
        {item.nextTimeAsk}
      </p>
    </div>
  );
}

export function Row({
  marker,
  status,
  heading,
  aside,
  quote,
  children,
}: {
  marker?: string;
  status: Status;
  heading: string;
  aside?: string;
  /** Text from the exercise this row is about, shown in quotes. */
  quote?: string;
  children: ReactNode;
}) {
  return (
    <li className="border-muted space-y-2 border-b py-4 first:pt-0 last:border-0 last:pb-0" data-testid="answer-key-row">
      <div className="flex items-center gap-2">
        {marker ? <Marker>{marker}</Marker> : null}
        <StatusIcon status={status} />
        <span className="text-foreground font-medium">{heading}</span>
        {aside ? <span className="text-muted-foreground ml-auto text-xs">{aside}</span> : null}
      </div>
      {quote ? <p className="text-muted-foreground italic">&ldquo;{quote}&rdquo;</p> : null}
      {children}
    </li>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-foreground font-semibold">{title}</h3>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
      <ul className="list-none pl-0">{children}</ul>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-muted rounded-xl border px-3 py-2">
      <p className="text-foreground text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

/** The AI's optional note and its takeaways, at the end of an answer key. */
export function CoachingFooter({
  coaching,
  metaTitle = "Perspective",
}: {
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
  metaTitle?: string;
}) {
  if (!coaching) return null;
  return (
    <>
      {coaching.metaNote ? (
        <section className="space-y-1">
          <h3 className="text-foreground font-semibold">{metaTitle}</h3>
          <p>{coaching.metaNote}</p>
        </section>
      ) : null}
      {coaching.takeaways.length > 0 ? (
        <section className="space-y-2" data-testid="answer-key-takeaways">
          <h3 className="text-foreground font-semibold">Take with you</h3>
          <ul className="list-disc space-y-1 pl-5">
            {coaching.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
