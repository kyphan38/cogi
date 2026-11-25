import type { Exercise } from "@/lib/types/exercise";

/** Exercise types a track step can use (the topic tracks use the first four). */
export type TrackStepType = "analytical" | "systems" | "evaluative" | "judgment" | "strategy" | "reframe";

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
  area: "finance" | "economics" | "geopolitics" | "business" | "society" | "politics";
  description: string;
  /**
   * Steps are about real events, laws and institutions, so generation prompts get the
   * fact-safety rule (no invented statistics, dates or quotes). PLAN-society.md S1.
   */
  realWorld?: boolean;
  /** Anchor of a related simulator on /simulators (PLAN-learning.md L4). */
  simulator?: "loan" | "savings" | "import";
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
    simulator: "loan",
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
    simulator: "savings",
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
    simulator: "import",
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
  {
    id: "news-detective",
    title: "Read the news like a detective",
    area: "society",
    description: "Who gains from a story, whose voice is missing, and how to check a viral claim before you share it.",
    steps: [
      {
        id: "missing-voice",
        type: "analytical",
        domain: "A news story where only one side gets quoted",
        learn: "Notice whose voice is missing from a story.",
      },
      {
        id: "who-gains",
        type: "systems",
        domain: "How a celebrity scandal spreads online and who earns from it",
        learn: "Follow who gains clicks, money or power from a story.",
      },
      {
        id: "charity-post",
        type: "analytical",
        domain: "A viral post claiming a charity kept the donations for itself",
        learn: "Ask what the records really show before you share.",
      },
      {
        id: "two-sources",
        type: "evaluative",
        domain: "Which source to trust when two news sites report opposite facts",
        learn: "Compare sources by evidence, track record and who pays them.",
      },
      {
        id: "family-rumour",
        type: "judgment",
        domain: "Family: a relative shares a shocking rumour in the family group chat",
        learn: "Correct a rumour without starting a family fight.",
      },
    ],
  },
  {
    id: "small-business",
    title: "Open a small business",
    area: "business",
    description: "Cash, costs and people: what to check before you put your savings into a shop or a company.",
    steps: [
      {
        id: "rich-quick",
        type: "analytical",
        domain: "A course promising you can get rich in six months with no experience",
        learn: "Spot the tricks in get-rich-quick promises.",
      },
      {
        id: "coffee-break-even",
        type: "evaluative",
        domain: "Opening a coffee shop: rent, staff and how many cups you must sell to break even",
        learn: "Count fixed costs and the break-even point before you invest.",
      },
      {
        id: "sales-no-cash",
        type: "systems",
        domain: "Why a shop with high sales can still run out of cash",
        learn: "See the gap between revenue on paper and cash in the bank.",
      },
      {
        id: "star-employee",
        type: "judgment",
        domain: "Work: your best salesperson breaks team rules and asks for a bigger share",
        learn: "Keep a star employee without breaking fairness.",
      },
      {
        id: "choose-partner",
        type: "evaluative",
        domain: "Choosing a business partner: money, skills or shared values",
        learn: "Weigh what keeps partners together after the first year.",
      },
    ],
  },
  {
    id: "vietnam-economy",
    title: "Vietnam's economy from above",
    area: "economics",
    description: "How US interest rates, the central bank and the state budget reach prices and pay in Vietnam.",
    simulator: "import",
    realWorld: true,
    steps: [
      {
        id: "fed-to-vnd",
        type: "systems",
        domain: "How a US Federal Reserve rate rise reaches the VND exchange rate and prices in Vietnam",
        learn: "Trace how US rates move the dong and Vietnamese prices.",
      },
      {
        id: "just-cut-rates",
        type: "analytical",
        domain: "A claim that the State Bank of Vietnam should simply cut rates to help business",
        learn: "Find what a simple rate-cut claim leaves out.",
      },
      {
        id: "public-pay",
        type: "evaluative",
        domain: "Raising public sector pay in Vietnam fast or slowly: budget, prices and fairness",
        learn: "Weigh higher pay against budget and price risks.",
      },
      {
        id: "set-prices",
        type: "systems",
        domain: "Why the state sets electricity and fuel prices in Vietnam, and who pays the gap",
        learn: "See who is protected and who pays when prices are set.",
      },
      {
        id: "which-project",
        type: "evaluative",
        domain: "Which to fund first in Vietnam: a new expressway, an airport or local hospitals",
        learn: "Compare public projects by cost, benefit and who gains.",
      },
    ],
  },
  {
    id: "us-politics",
    title: "How US politics works",
    area: "politics",
    description: "Elections, money and the big problems of US society - how the system works, not who is right.",
    realWorld: true,
    steps: [
      {
        id: "popular-vote",
        type: "analytical",
        domain: "A claim that the candidate with the most votes always wins the US presidency",
        learn: "See how the electoral college can differ from the popular vote.",
      },
      {
        id: "swing-states",
        type: "systems",
        domain: "How a few swing states shape US campaign promises and spending",
        learn: "See why a few states get most of the attention.",
      },
      {
        id: "lobbying",
        type: "analytical",
        domain: "A claim that lobbying in Washington is just free speech and changes nothing",
        learn: "Separate what lobbying does from how people describe it.",
      },
      {
        id: "fentanyl",
        type: "systems",
        domain: "How the fentanyl crisis links drug supply, health care and homelessness in the US",
        learn: "Map how one crisis feeds others.",
      },
      {
        id: "us-debt",
        type: "evaluative",
        domain: "Three ways to bring down the US national debt: higher taxes, spending cuts or growth",
        learn: "Compare debt plans by who pays and how fast they work.",
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

/** True when the topic is a step of a track about real events and institutions. */
export function isRealWorldTrackDomain(domain: string): boolean {
  const d = domain.trim();
  return TRACKS.some((t) => t.realWorld && t.steps.some((s) => s.domain === d));
}
