import type { Exercise } from "@/lib/types/exercise";

/** Exercise types a track step can use. */
export type TrackStepType = "analytical" | "systems" | "evaluative" | "judgment";

export interface TrackStep {
  id: string;
  type: TrackStepType;
  /**
   * The topic sent to the generator (the exercise "domain"). Finished exercises with
   * the same type and domain count as this step done. For life situations it is the
   * area of life.
   */
  domain: string;
  /** One line: what this step teaches. */
  learn: string;
}

export interface Track {
  id: string;
  title: string;
  area: "finance" | "economics" | "geopolitics";
  description: string;
  steps: TrackStep[];
}

/**
 * Topic tracks (PLAN-learning.md L3): ordered steps through economics, finance and
 * geopolitics using the existing exercise types. Steps run at the user's own level for
 * each type (Guided for a new user). Domains avoid the words that switch a topic to
 * the expert-only geopolitics variant (`isGeopoliticsAnalyticalDomain`).
 */
export const TRACKS: Track[] = [
  {
    id: "money-and-rates",
    title: "Money and interest rates",
    area: "finance",
    description: "How interest rates move money between savers, borrowers and banks - and how to use that in your own choices.",
    steps: [
      {
        id: "rates-winners",
        type: "analytical",
        domain: "Interest rates go up: who gains and who loses",
        learn: "Spot claims about interest rates that leave out who pays.",
      },
      {
        id: "rates-map",
        type: "systems",
        domain: "How a central bank rate change reaches home loans, savings and prices",
        learn: "Trace one rate decision through loans, savings and prices.",
      },
      {
        id: "debt-or-savings",
        type: "evaluative",
        domain: "Pay off a credit card debt first or build savings first",
        learn: "Weigh interest cost against the safety of having cash.",
      },
      {
        id: "safe-return-ad",
        type: "analytical",
        domain: "An advertisement promising a safe 12% yearly return",
        learn: "See why high return and no risk rarely come together.",
      },
      {
        id: "relative-investment",
        type: "judgment",
        domain: "Money: a relative asks you to put your savings into their business",
        learn: "Say no or set limits on money without hurting the family.",
      },
    ],
  },
  {
    id: "prices-and-inflation",
    title: "Prices and inflation",
    area: "economics",
    description: "Why prices rise, how a shock in one place reaches your shopping basket, and how to read claims about it.",
    steps: [
      {
        id: "one-cause",
        type: "analytical",
        domain: "A news article blaming rising food prices on one single cause",
        learn: "Notice when one cause is blamed for a change with many causes.",
      },
      {
        id: "oil-shock",
        type: "systems",
        domain: "How a jump in oil prices spreads to transport, food prices and wages",
        learn: "Follow a price shock from fuel to food to wages.",
      },
      {
        id: "cut-costs",
        type: "evaluative",
        domain: "Which household costs to cut first when prices rise",
        learn: "Compare cuts by how much they save and how much they hurt.",
      },
      {
        id: "minimum-wage",
        type: "systems",
        domain: "A higher minimum wage: effects on workers, small shops and prices",
        learn: "See that one policy helps some groups and costs others.",
      },
      {
        id: "print-money",
        type: "analytical",
        domain: "A politician's claim that printing more money will make everyone richer",
        learn: "Check a tempting money claim against how prices respond.",
      },
    ],
  },
  {
    id: "countries-trade",
    title: "How countries trade and compete",
    area: "geopolitics",
    description: "Taxes on imports, factories moving between countries and currency moves - what they mean for people and companies.",
    steps: [
      {
        id: "tariffs-who-pays",
        type: "analytical",
        domain: "Why a country taxes imported goods (tariffs) and who really pays",
        learn: "Find out who pays an import tax in the end.",
      },
      {
        id: "phone-tariff",
        type: "systems",
        domain: "How a tax on imported phones affects factories, shops and shoppers",
        learn: "Map how an import tax moves through a market.",
      },
      {
        id: "next-factory",
        type: "evaluative",
        domain: "Where a company should open its next factory: three countries compared",
        learn: "Compare countries by cost, skills, stability and rules.",
      },
      {
        id: "strong-currency",
        type: "analytical",
        domain: "A speech claiming a strong currency is always good for a country",
        learn: "See who wins and who loses when a currency gets stronger.",
      },
      {
        id: "move-abroad",
        type: "judgment",
        domain: "Work: your company asks you to move abroad to run a new factory",
        learn: "Weigh a career chance against family and stability.",
      },
    ],
  },
];

/** Exercise page for a step, with its topic filled in (the user still presses Generate). */
export function trackStepHref(step: TrackStep): string {
  return `/exercise/${step.type}?domain=${encodeURIComponent(step.domain)}`;
}

/** Steps done: a finished exercise of the same type and domain. */
export function trackProgress(track: Track, completed: Exercise[]): { doneIds: Set<string>; next: TrackStep | null } {
  const doneIds = new Set(
    track.steps
      .filter((s) => completed.some((e) => e.completedAt && e.type === s.type && e.domain.trim() === s.domain))
      .map((s) => s.id),
  );
  return { doneIds, next: track.steps.find((s) => !doneIds.has(s.id)) ?? null };
}

/**
 * The track to show on Home: the unfinished one the user worked on most recently;
 * otherwise the first unfinished track. Null when every track is done.
 */
export function currentTrack(completed: Exercise[]): Track | null {
  let best: { track: Track; at: string } | null = null;
  for (const track of TRACKS) {
    if (!trackProgress(track, completed).next) continue;
    const last = completed
      .filter((e) => e.completedAt && track.steps.some((s) => s.type === e.type && s.domain === e.domain.trim()))
      .map((e) => e.completedAt!)
      .sort()
      .at(-1);
    if (last && (!best || last > best.at)) best = { track, at: last };
  }
  return best?.track ?? TRACKS.find((t) => trackProgress(t, completed).next) ?? null;
}
