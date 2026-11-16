"use client";

import { CALIBRATION_CATEGORIES } from "@/lib/exercise/calibration-bank";
import { catalogGroupOf } from "@/lib/exercise/exercise-domain-catalog";
import { GEOPOLITICS_DOMAIN_GROUPS } from "@/lib/exercise/geopolitics-domains";
import {
  BASE_RATE_POPULATION,
  type BaseRateItem,
  type CalibrationItem,
  type CalibrationTopic,
} from "@/lib/exercise/calibration-math";
import { type CalibrationAnswer } from "@/lib/exercise/calibration-score";

export type FlowStep = 0 | 1 | 4 | 7;
/** Internal step that shows AI feedback (the 3rd practice phase); 7 is "saved". */
export const FEEDBACK_STEP = 4;

export const PART_LABELS = {
  learn: "Part 1 of 2 · Learn first",
  answer: "Part 2 of 2 · Answer and say how sure",
} as const;

export const TOPICS: CalibrationTopic[] = ["Mixed", ...CALIBRATION_CATEGORIES];

/** The Practice-page group a domain comes from, so the topic can start close to it. */
export function groupIdOf(domain: string): string | undefined {
  const d = domain.trim();
  return (
    catalogGroupOf(d)?.id ??
    GEOPOLITICS_DOMAIN_GROUPS.find((g) =>
      (g.domains as readonly string[]).includes(d),
    )?.id
  );
}

/** "1,200" or "1 200" -> 1200; empty or not a number -> undefined. */
export function parseNumber(text: string): number | undefined {
  const t = text.replace(/[,\s]/g, "");
  if (!t) return undefined;
  const v = Number(t);
  return Number.isFinite(v) ? v : undefined;
}

export const fmt = (x: number) =>
  x.toLocaleString("en-US", { maximumFractionDigits: 1 });

export function isAnswered(
  item: CalibrationItem,
  a: CalibrationAnswer | undefined,
): boolean {
  if (!a) return false;
  if (item.kind === "binary") return a.choice != null && a.confidence != null;
  if (item.kind === "interval") return a.low != null && a.high != null;
  return a.estimate != null;
}

/** The "out of 10,000" table for a base-rate problem (first test only). */
export function FrequencyTable({ item }: { item: BaseRateItem }) {
  const c = item.counts;
  const l = item.labels;
  return (
    <div
      className="border-t border-border pt-3 text-body"
      data-testid="frequency-table"
    >
      <p className="font-medium">
        Out of {fmt(BASE_RATE_POPULATION)} {l.unit}:
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li>
          {fmt(c.has)} {l.has}. {fmt(c.truePositives)} of them {l.positive}.
        </li>
        <li>
          {fmt(c.hasNot)} {l.hasNot}. {fmt(c.falsePositives)} of them still{" "}
          {l.positive}.
        </li>
      </ul>
      <p className="text-muted-foreground mt-1">
        Of all the {l.unit} that {l.positive}, how many really {l.has}?
      </p>
    </div>
  );
}

/** Calibration: how sure vs how right (PLAN-psychology.md P2). Built in code; the AI only coaches. */
