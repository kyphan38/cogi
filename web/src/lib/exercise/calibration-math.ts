import {
  CALIBRATION_BANK,
  type BinaryBankItem,
  type CalibrationCategory,
  type IntervalBankItem,
} from "@/lib/exercise/calibration-bank";
import { CALIBRATION_LEVELS } from "@/lib/exercise/calibration-levels";
import type { PracticeLevel } from "@/lib/exercise/levels";
import { seededHash } from "@/lib/exercise/guided-candidates";

/**
 * Base-rate problems and exercise building for Calibration (PLAN-psychology.md P2).
 * The numbers and the answer come from code; the stories are fixed templates, so
 * nothing here depends on the AI.
 */

/** "Out of 10,000": every count in the table is a whole number with these choices. */
export const BASE_RATE_POPULATION = 10000;
const BASE_RATES = [1, 2, 5, 10] as const;
const HIT_RATES = [80, 90, 95] as const;
const FALSE_ALARM_RATES = [5, 10, 20] as const;

interface BaseRateTemplate {
  key: string;
  /** Uses {base}, {hit}, {false}. */
  story: string;
  question: string;
  /** Sentence added for the two-step version, then its question. */
  again: string;
  againQuestion: string;
  /** For the table: "have the illness", "do not have it", "test positive". */
  has: string;
  hasNot: string;
  positive: string;
  unit: string;
}

const TEMPLATES: BaseRateTemplate[] = [
  {
    key: "illness",
    story: "A clinic checks adults for a rare illness. {base}% of the people checked have it. The test is positive for {hit}% of people who have the illness, and also for {false}% of people who do not.",
    question: "One person tests positive. What is the chance that they really have the illness?",
    again: "The same person then takes a second, separate test of the same kind, and it is positive again.",
    againQuestion: "After two positive tests, what is the chance that they really have the illness?",
    has: "have the illness",
    hasNot: "do not have it",
    positive: "test positive",
    unit: "people",
  },
  {
    key: "phones",
    story: "{base}% of the phones from a factory have a hidden fault. A quality scanner flags {hit}% of the faulty phones, and also flags {false}% of the good phones by mistake.",
    question: "A phone is flagged. What is the chance that it is really faulty?",
    again: "The phone then goes through a second, separate scanner of the same kind, and it is flagged again.",
    againQuestion: "After two flags, what is the chance that the phone is really faulty?",
    has: "are faulty",
    hasNot: "are fine",
    positive: "are flagged",
    unit: "phones",
  },
  {
    key: "scam",
    story: "{base}% of the emails a company gets are scams. Its filter marks {hit}% of scam emails as scams, and also marks {false}% of normal emails as scams.",
    question: "An email is marked as a scam. What is the chance that it really is one?",
    again: "A second, separate filter of the same kind checks the email, and it marks it as a scam too.",
    againQuestion: "After both filters mark it, what is the chance that the email really is a scam?",
    has: "are scams",
    hasNot: "are normal",
    positive: "are marked as scams",
    unit: "emails",
  },
  {
    key: "fraud",
    story: "{base}% of the card payments at an online shop are fraud. The bank's alarm goes off for {hit}% of fraud payments, and also for {false}% of honest payments.",
    question: "The alarm goes off for a payment. What is the chance that it is really fraud?",
    again: "A second, separate alarm system of the same kind also checks the payment, and it goes off too.",
    againQuestion: "After both alarms go off, what is the chance that the payment is really fraud?",
    has: "are fraud",
    hasNot: "are honest",
    positive: "set off the alarm",
    unit: "payments",
  },
  {
    key: "hiring",
    story: "{base}% of the people who apply for a job would be excellent at it. A skills test gives a pass to {hit}% of these excellent people, and also to {false}% of the others.",
    question: "An applicant passes the test. What is the chance that they would be excellent at the job?",
    again: "The applicant then takes a second, separate test of the same kind, and passes again.",
    againQuestion: "After passing both tests, what is the chance that the applicant would be excellent?",
    has: "would be excellent",
    hasNot: "would not",
    positive: "pass the test",
    unit: "applicants",
  },
  {
    key: "bags",
    story: "{base}% of the bags at an airport hold a forbidden item. The scanner beeps for {hit}% of those bags, and also for {false}% of normal bags.",
    question: "The scanner beeps for a bag. What is the chance that it really holds a forbidden item?",
    again: "The bag goes through a second, separate scanner of the same kind, and it beeps again.",
    againQuestion: "After two beeps, what is the chance that the bag really holds a forbidden item?",
    has: "hold a forbidden item",
    hasNot: "are normal",
    positive: "make the scanner beep",
    unit: "bags",
  },
];

export interface BaseRateItem {
  id: string;
  kind: "baserate";
  story: string;
  question: string;
  /** Percent. */
  baseRate: number;
  hitRate: number;
  falseAlarmRate: number;
  twoStep: boolean;
  /** One test, out of 10,000. */
  counts: { has: number; hasNot: number; truePositives: number; falsePositives: number };
  /** Words for the table. */
  labels: { has: string; hasNot: string; positive: string; unit: string };
  /** The right answer in percent, one decimal place. */
  answer: number;
  explanation: string;
}

export type CalibrationItem = BinaryBankItem | IntervalBankItem | BaseRateItem;

/** Small seeded generator, so one exercise id always gives the same exercise. */
export function seededRandom(seed: string): () => number {
  let a = seededHash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rand: () => number, xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const fill = (s: string, base: number, hit: number, fa: number) =>
  s.replace("{base}", String(base)).replace("{hit}", String(hit)).replace("{false}", String(fa));
const round1 = (x: number) => Math.round(x * 10) / 10;
const fmt = (x: number) => (Number.isInteger(x) ? x.toLocaleString("en-US") : x.toLocaleString("en-US", { maximumFractionDigits: 1 }));

/**
 * The chance of the condition after `tests` positive results (each independent):
 * true positives over all positives, in percent.
 */
export function positivePredictiveValue(base: number, hit: number, falseAlarm: number, tests = 1): number {
  const tp = (base / 100) * (hit / 100) ** tests;
  const fp = (1 - base / 100) * (falseAlarm / 100) ** tests;
  return (tp / (tp + fp)) * 100;
}

export function makeBaseRateItem(id: string, template: BaseRateTemplate, rand: () => number, twoStep: boolean): BaseRateItem {
  const base = pick(rand, BASE_RATES);
  const hit = pick(rand, HIT_RATES);
  const fa = pick(rand, FALSE_ALARM_RATES);
  const has = (BASE_RATE_POPULATION * base) / 100;
  const hasNot = BASE_RATE_POPULATION - has;
  const truePositives = (has * hit) / 100;
  const falsePositives = (hasNot * fa) / 100;
  const answer = round1(positivePredictiveValue(base, hit, fa, twoStep ? 2 : 1));
  const oneTest = `Out of ${fmt(BASE_RATE_POPULATION)} ${template.unit}, ${fmt(has)} ${template.has} and ${fmt(truePositives)} of them ${template.positive}. ${fmt(hasNot)} ${template.hasNot}, but ${fmt(falsePositives)} of them still ${template.positive}. So only ${fmt(truePositives)} of the ${fmt(truePositives + falsePositives)} that ${template.positive} really ${template.has}: about ${round1(positivePredictiveValue(base, hit, fa))}%.`;
  const explanation = twoStep
    ? `${oneTest} The second test starts from that number: of those ${fmt(truePositives)}, ${hit}% ${template.positive} again; of the other ${fmt(falsePositives)}, only ${fa}% do. That gives about ${answer}%.`
    : oneTest;
  return {
    id,
    kind: "baserate",
    story: twoStep ? `${fill(template.story, base, hit, fa)} ${template.again}` : fill(template.story, base, hit, fa),
    question: twoStep ? template.againQuestion : template.question,
    baseRate: base,
    hitRate: hit,
    falseAlarmRate: fa,
    twoStep,
    counts: { has, hasNot, truePositives, falsePositives },
    labels: { has: template.has, hasNot: template.hasNot, positive: template.positive, unit: template.unit },
    answer,
    explanation,
  };
}

/** Bank items for a category ("Mixed" = all), unseen ones first, in a seeded order. */
function choose<T extends BinaryBankItem | IntervalBankItem>(
  pool: T[],
  count: number,
  seed: string,
  seen: ReadonlySet<string>,
): T[] {
  return [...pool]
    .map((item) => ({ item, key: (seen.has(item.id) ? 2 ** 32 : 0) + seededHash(seed + item.id) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map((x) => x.item);
}

export type CalibrationTopic = CalibrationCategory | "Mixed";

/** Build a Calibration exercise for a level. `seenIds` are bank ids from earlier exercises. */
export function buildCalibrationItems(input: {
  id: string;
  level: PracticeLevel;
  topic: CalibrationTopic;
  seenIds?: ReadonlySet<string>;
}): CalibrationItem[] {
  const cfg = CALIBRATION_LEVELS[input.level];
  const seen = input.seenIds ?? new Set<string>();
  const inTopic = CALIBRATION_BANK.filter((x) => input.topic === "Mixed" || x.category === input.topic);
  const binary = choose(inTopic.filter((x): x is BinaryBankItem => x.kind === "binary"), cfg.binaryCount, input.id, seen);
  const interval = choose(
    inTopic.filter((x): x is IntervalBankItem => x.kind === "interval"),
    cfg.intervalCount,
    input.id,
    seen,
  );
  const rand = seededRandom(`${input.id}-base-rate`);
  const templates = [...TEMPLATES].sort((a, b) => seededHash(input.id + a.key) - seededHash(input.id + b.key));
  const baseRates = Array.from({ length: cfg.baseRateCount }, (_, i) =>
    makeBaseRateItem(
      `br-${i + 1}`,
      templates[i % templates.length]!,
      rand,
      cfg.twoStepBaseRate && i === cfg.baseRateCount - 1,
    ),
  );
  return [...binary, ...interval, ...baseRates];
}
