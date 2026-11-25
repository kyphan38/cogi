import { REFRAME_TAGS, type ReframeTag } from "@/lib/ai/validators/reframe";
import { JUDGMENT_LENSES, type JudgmentLens } from "@/lib/ai/validators/judgment";
import { analyticalResultOf } from "@/lib/exercise/analytical-score";
import { LENS_INFO } from "@/lib/exercise/judgment-levels";
import { REFRAME_TAG_INFO } from "@/lib/exercise/reframe-levels";
import { TAG_LABELS } from "@/lib/exercise/tag-labels";
import type { EmbeddedIssue, Exercise, ThinkingType } from "@/lib/types/exercise";

/**
 * "Your weak spots": the mistakes the user makes most often, counted in code from
 * the stored results of finished exercises. No AI call.
 */
export interface WeakSpot {
  /** Stable id, also the `?focus=` value: "<type>:<what>". */
  key: string;
  type: ThinkingType;
  label: string;
  misses: number;
  chances: number;
}

/** How many of the newest finished exercises are counted. */
export const WEAK_SPOT_WINDOW = 40;
export const WEAK_SPOT_COUNT = 3;
/** A spot needs this many misses, and this share of its chances missed. */
const MIN_MISSES = 2;
const MIN_RATE = 1 / 3;

const ISSUE_TYPES = Object.keys(TAG_LABELS).filter((t) => t !== "valid_point" && t !== "unclear") as EmbeddedIssue["type"][];

type SpotInfo = { type: ThinkingType; label: string; /** What the next exercise should test. Null: nothing to aim. */ aim: string | null };

/** Every spot the app knows, by key. Unknown keys (an old link, a typo) give null. */
export function weakSpotInfo(key: string): SpotInfo | null {
  const [type, what] = key.split(":") as [string, string | undefined];
  if (!what) return null;
  if (type === "analytical") {
    if (what === "sound") {
      return { type, label: "Calling a sound point a problem", aim: "sound statements that look suspicious at first but are fair" };
    }
    if (!ISSUE_TYPES.includes(what as EmbeddedIssue["type"])) return null;
    const name = TAG_LABELS[what as EmbeddedIssue["type"]].label;
    return { type, label: `Missing: ${name}`, aim: `spotting "${name}" issues` };
  }
  if (type === "reframe") {
    if (what === "realistic") return { type, label: "Calling a fair thought a trap", aim: "telling a fair, realistic thought from a thinking trap" };
    if (!REFRAME_TAGS.includes(what as ReframeTag)) return null;
    const name = REFRAME_TAG_INFO[what as ReframeTag].name;
    return { type, label: `Missing the trap: ${name}`, aim: `spotting the "${name}" trap` };
  }
  if (type === "judgment") {
    if (what === "top") return { type, label: "Picking the best response", aim: "telling the best response from one that only sounds good" };
    if (!JUDGMENT_LENSES.includes(what as JudgmentLens)) return null;
    const name = LENS_INFO[what as JudgmentLens].name;
    return { type, label: `The "${name}" lens`, aim: `reading the situation through the "${name}" lens` };
  }
  const fixed: Record<string, SpotInfo> = {
    "systems:links": { type: "systems", label: "Missing a connection", aim: "connections that are easy to overlook" },
    "systems:direction": { type: "systems", label: "Drawing a link the wrong way", aim: "the direction of cause and effect between parts" },
    "systems:impact": { type: "systems", label: "Who a shock hits", aim: "telling direct effects of the shock from indirect ones" },
    "strategy:prediction": { type: "strategy", label: "Where the players end up", aim: "predicting the outcome the players settle on" },
    "strategy:best-reply": { type: "strategy", label: "A player's best reply", aim: "finding each player's best reply to the other's choice" },
    "evaluative:placement": { type: "evaluative", label: "Placing options on the matrix", aim: "judging an option on two criteria at once" },
    "evaluative:top": { type: "evaluative", label: "Picking the best option", aim: "a best option that is not the obvious one" },
    "calibration:overconfident": { type: "calibration", label: "Very sure, but wrong", aim: null },
    "calibration:interval": { type: "calibration", label: "Ranges that miss the answer", aim: null },
  };
  return fixed[key] ?? null;
}

/** The line added to the generation prompt for `?focus=<key>`, or "" when there is nothing to aim. */
export function practiceFocusLine(key: string | null | undefined): string {
  const aim = key ? weakSpotInfo(key)?.aim : null;
  if (!aim) return "";
  return `Practice focus: this learner often gets one thing wrong: ${aim}. Build the exercise so this skill is tested more than once, at different difficulty. Stay inside every rule above, and do not name the focus in the text.`;
}

export function weakSpotHref(spot: Pick<WeakSpot, "key" | "type">): string {
  return `/exercise/${spot.type}?focus=${encodeURIComponent(spot.key)}`;
}

/** Records one chance to get something right, and whether it was missed. */
type AddChance = (key: string, missed: boolean) => void;

function tallyExercise(ex: Exercise, add: AddChance): void {
  switch (ex.type) {
    case "analytical": {
      const r = analyticalResultOf(ex);
      for (const i of r.issues) add(`analytical:${i.type}`, !i.found);
      for (const d of r.decoys) add("analytical:sound", d.trapped);
      return;
    }
    case "reframe": {
      for (const t of ex.result?.thoughts ?? []) {
        if (t.trap === "realistic") add("reframe:realistic", t.trapped);
        else add(`reframe:${t.trap}`, !t.found);
      }
      return;
    }
    case "judgment": {
      if (!ex.result) return;
      for (const l of ex.result.lenses) if (l.correct !== null) add(`judgment:${l.lens}`, !l.correct);
      add("judgment:top", !ex.result.topMatch);
      return;
    }
    case "systems": {
      if (!ex.result) return;
      for (const c of ex.result.connections) {
        add("systems:links", !c.found);
        if (c.found) add("systems:direction", c.direction === "reversed");
      }
      for (const i of ex.result.impacts) add("systems:impact", !i.correct);
      return;
    }
    case "strategy": {
      if (!ex.result) return;
      add("strategy:prediction", !ex.result.predictionCorrect);
      for (const b of ex.result.bestReplies) add("strategy:best-reply", !b.correct);
      return;
    }
    case "evaluative": {
      const r = ex.result;
      if (!r) return;
      if (r.variant === "matrix") for (const p of r.placements) add("evaluative:placement", !p.correct);
      else add("evaluative:top", !r.topMatch);
      return;
    }
    case "calibration": {
      for (const i of ex.result?.items ?? []) {
        if (!i.answered) continue;
        if (i.kind === "binary" && (i.confidence ?? 0) >= 90) add("calibration:overconfident", !i.correct);
        if (i.kind === "interval") add("calibration:interval", !i.correct);
      }
      return;
    }
    default:
      return;
  }
}

/**
 * Labels of what one finished exercise missed, most missed first. Unknown keys are
 * left out. Same counting as `weakSpots`.
 */
export function missesOf(ex: Exercise): string[] {
  const counts = new Map<string, number>();
  tallyExercise(ex, (key, missed) => {
    if (missed) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => weakSpotInfo(key)?.label)
    .filter((label): label is string => !!label);
}

/** Misses and chances per spot key, over the given finished rows. */
export type Tally = { misses: number; chances: number };

export function tallyRows(rows: Exercise[]): Map<string, Tally> {
  const tallies = new Map<string, Tally>();
  const add: AddChance = (key, missed) => {
    const t = tallies.get(key) ?? { misses: 0, chances: 0 };
    t.chances += 1;
    if (missed) t.misses += 1;
    tallies.set(key, t);
  };
  for (const ex of rows) if (ex.completedAt) tallyExercise(ex, add);
  return tallies;
}

/** True when a tally is bad enough to be a weak spot. */
export function isWeak(t: Tally): boolean {
  return t.misses >= MIN_MISSES && t.misses / t.chances >= MIN_RATE;
}

/**
 * The few things missed most often in the newest finished exercises
 * (`completed` is newest first). Most misses first; ties go to the higher miss rate.
 */
export function weakSpots(completed: Exercise[], count: number = WEAK_SPOT_COUNT): WeakSpot[] {
  const tallies = tallyRows(completed.filter((e) => e.completedAt).slice(0, WEAK_SPOT_WINDOW));
  const spots: WeakSpot[] = [];
  for (const [key, t] of tallies) {
    const info = weakSpotInfo(key);
    if (!info || !isWeak(t)) continue;
    spots.push({ key, type: info.type, label: info.label, ...t });
  }
  return spots
    .sort((a, b) => b.misses - a.misses || b.misses / b.chances - a.misses / a.chances || a.key.localeCompare(b.key))
    .slice(0, count);
}
