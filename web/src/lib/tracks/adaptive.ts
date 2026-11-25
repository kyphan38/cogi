import { TRACKS, type TrackStepType } from "@/lib/exercise/tracks";
import { isWeak, tallyRows, weakSpotInfo, weakSpots, type Tally } from "@/lib/exercise/weak-spots";
import { rateExercise } from "@/lib/exercise/rate-exercise";
import { redoForTrack } from "@/lib/exercise/redo";
import { addDays, localDay } from "@/lib/review/schedule";
import type { Exercise } from "@/lib/types/exercise";

/**
 * Adaptive tracks (PLAN-adaptive-tracks.md A2): six steps built in code from the
 * user's own results. No AI call here; AI topic ideas come in only as input.
 */

export const TRACK_SIZE = 6;
/** No step finished for this many days: offer to close the track. */
export const STALE_DAYS = 14;
/** Weak spots one track aims at. */
export const MAX_TARGETS = 2;
/** Recaps kept in the doc. */
export const PAST_KEEP = 12;
const MAX_PER_TYPE = 3;

const STEP_TYPES: readonly TrackStepType[] = ["analytical", "systems", "evaluative", "judgment", "strategy", "reframe"];
/** Types with a "your own situation" mode (custom scenario). Strategy has none. */
export const OWN_TYPES: readonly TrackStepType[] = ["analytical", "systems", "evaluative", "judgment", "reframe"];

export type StepKind = "new" | "fix" | "redo" | "own";

export interface GenStep {
  /** Unique: "<trackId>-<1..6>". Saved on the exercise as `trackStepId`. */
  id: string;
  kind: StepKind;
  type: TrackStepType;
  /** The topic sent to the generator. Empty: the user picks (own, or no topic left). */
  domain: string;
  /** Weak spot key, sent as `?focus=`. */
  focus?: string;
  /** Exercise id to redo. */
  redoOf?: string;
  source?: "catalog" | "saved" | "ai";
  skipped?: boolean;
}

export interface GenTrack {
  id: string;
  /** Track number: 1, 2, 3... */
  n: number;
  startedAt: string;
  /** Weak spot keys this track aims at. */
  targets: string[];
  /** Each target's misses and chances when the track started. */
  baseline: Record<string, Tally>;
  steps: GenStep[];
}

export interface TrackRecapTarget {
  key: string;
  before: Tally;
  /** Counted only in this track's exercises. */
  during: Tally;
  /** Practised in this track and no longer weak there. */
  below: boolean;
  /** Below in this track and in the last track that aimed at it. One track is too small a sample. */
  cleared: boolean;
}

export interface TrackRecap {
  id: string;
  n: number;
  startedAt: string;
  closedAt: string;
  closeReason: "done" | "stale";
  done: number;
  skipped: number;
  total: number;
  ratings: { good: number; ok: number; poor: number };
  targets: TrackRecapTarget[];
  /** The user has seen the recap on Today. */
  seen?: boolean;
}

export interface AdaptiveTracksDoc {
  id: "adaptiveTracks";
  current: GenTrack | null;
  /** Newest first, at most PAST_KEEP. */
  past: TrackRecap[];
}

/** A saved or AI topic idea; `title` is what the generator gets as the domain. */
export interface TopicOption {
  mode: string;
  title: string;
}

export interface BuildInput {
  id: string;
  n: number;
  /** ISO time the track starts. */
  now: string;
  /** Local day, "YYYY-MM-DD". */
  today: string;
  /** Finished exercises, newest first. */
  completed: Exercise[];
  /** Finished and unfinished rows, so an exercise being redone is not offered twice. */
  all: { id: string; type: Exercise["type"]; completedAt: string | null; redoOf?: string }[];
  /** Normalized titles from `practicedTopics`. */
  practiced: ReadonlySet<string>;
  saved: TopicOption[];
  aiIdeas?: TopicOption[];
  past: TrackRecap[];
}

/** Same rule as `normalizeTitleKey` in db/practiced-topics (kept here so this file has no db import). */
const topicKey = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

const isStepType = (t: string): t is TrackStepType => (STEP_TYPES as readonly string[]).includes(t);

const stepIdOf = (ex: Exercise): string | undefined => ("trackStepId" in ex ? ex.trackStepId : undefined);

const ZERO: Tally = { misses: 0, chances: 0 };

type Topic = { type: TrackStepType; domain: string; source: NonNullable<GenStep["source"]> };

/** Topics not done yet: topic tracks first (hand-picked), then saved ideas, then AI ideas. */
function topicPool(input: BuildInput): Topic[] {
  const done = new Set([...input.completed.map((e) => topicKey(e.domain)), ...input.practiced]);
  const all: Topic[] = [
    ...TRACKS.flatMap((t) => t.steps.map((s) => ({ type: s.type, domain: s.domain, source: "catalog" as const }))),
    ...input.saved.filter((t) => isStepType(t.mode)).map((t) => ({ type: t.mode as TrackStepType, domain: t.title, source: "saved" as const })),
    ...(input.aiIdeas ?? []).filter((t) => isStepType(t.mode)).map((t) => ({ type: t.mode as TrackStepType, domain: t.title, source: "ai" as const })),
  ];
  const seen = new Set<string>();
  return all.filter((t) => {
    const key = topicKey(t.domain);
    if (!key || done.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The next track. With weak spots: new, fix, new, redo (or a second fix), new, own.
 * Without (a new user): five new steps of different types, then own.
 */
export function buildNextTrack(input: BuildInput): GenTrack {
  const cleared = new Set(input.past[0]?.targets.filter((t) => t.cleared).map((t) => t.key) ?? []);
  const targets = weakSpots(input.completed, 5)
    .filter((s) => isStepType(s.type) && weakSpotInfo(s.key)?.aim && !cleared.has(s.key))
    .slice(0, MAX_TARGETS)
    .map((s) => ({ ...s, type: s.type as TrackStepType }));

  const pool = topicPool(input);
  const count = new Map<TrackStepType, number>();
  const addType = (type: TrackStepType) => count.set(type, (count.get(type) ?? 0) + 1);
  const canUse = (type: TrackStepType) => (count.get(type) ?? 0) < MAX_PER_TYPE;
  const hasTopic = (type: TrackStepType) => pool.some((t) => t.type === type);
  const recent = new Map<string, number>();
  for (const e of input.completed.slice(0, TRACK_SIZE)) recent.set(e.type, (recent.get(e.type) ?? 0) + 1);

  const takeTopic = (type: TrackStepType): Pick<GenStep, "domain" | "source"> => {
    const i = pool.findIndex((t) => t.type === type);
    if (i < 0) return { domain: "" };
    const [t] = pool.splice(i, 1);
    return { domain: t!.domain, source: t!.source };
  };

  /** A type for a new step: the preferred one if allowed; else one not in the track yet, with a topic, practised least lately. */
  const newType = (prefer?: TrackStepType): TrackStepType => {
    if (prefer && canUse(prefer)) return prefer;
    const rank = (t: TrackStepType) => [count.has(t) ? 1 : 0, hasTopic(t) ? 0 : 1, recent.get(t) ?? 0, STEP_TYPES.indexOf(t)];
    const options = STEP_TYPES.filter(canUse).sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      for (let k = 0; k < ra.length; k++) if (ra[k] !== rb[k]) return ra[k]! - rb[k]!;
      return 0;
    });
    return options[0] ?? "judgment";
  };

  const newStep = (prefer?: TrackStepType): Omit<GenStep, "id"> => {
    const type = newType(prefer);
    addType(type);
    return { kind: "new", type, ...takeTopic(type) };
  };
  const fixStep = (t: (typeof targets)[number]): Omit<GenStep, "id"> => {
    addType(t.type);
    return { kind: "fix", type: t.type, focus: t.key, ...takeTopic(t.type) };
  };

  let slots: Omit<GenStep, "id">[];
  if (targets.length === 0) {
    slots = Array.from({ length: TRACK_SIZE - 1 }, () => newStep());
  } else {
    const [t1, t2] = targets as [(typeof targets)[number], (typeof targets)[number] | undefined];
    const fix = fixStep(t1);
    const redoEx = redoForTrack(input.completed, input.all, input.today, targets.map((t) => t.type), rateExercise);
    let second: Omit<GenStep, "id">;
    if (redoEx && isStepType(redoEx.type)) {
      addType(redoEx.type);
      second = { kind: "redo", type: redoEx.type, domain: redoEx.domain, redoOf: redoEx.id };
    } else {
      second = fixStep(t2 ?? t1);
    }
    // One new step practises the main target's type on a fresh topic.
    const n1 = newStep(t1.type);
    const n2 = newStep();
    const n3 = newStep();
    slots = [n1, fix, n2, second, n3];
  }

  const ownPrefer = targets[0]?.type;
  const ownType =
    ownPrefer && OWN_TYPES.includes(ownPrefer) && canUse(ownPrefer)
      ? ownPrefer
      : (OWN_TYPES.filter(canUse).sort((a, b) => (count.get(a) ?? 0) - (count.get(b) ?? 0))[0] ?? "judgment");
  addType(ownType);
  slots.push({ kind: "own", type: ownType, domain: "" });

  return {
    id: input.id,
    n: input.n,
    startedAt: input.now,
    targets: targets.map((t) => t.key),
    baseline: Object.fromEntries(targets.map((t) => [t.key, { misses: t.misses, chances: t.chances }])),
    steps: slots.map((s, i) => ({ id: `${input.id}-${i + 1}`, ...s })),
  };
}

/** New steps that found no topic. When above 0, fetch AI ideas once and build again. */
export function missingTopics(track: GenTrack): number {
  return track.steps.filter((s) => s.kind === "new" && !s.domain).length;
}

/** The finished exercises that belong to this track. */
export function trackRows(track: GenTrack, completed: Exercise[]): Exercise[] {
  const ids = new Set(track.steps.map((s) => s.id));
  return completed.filter((e) => {
    const id = stepIdOf(e);
    return !!e.completedAt && !!id && ids.has(id);
  });
}

/** Steps done (a finished exercise with the step's id), the next open step, and whether all are passed. */
export function genTrackProgress(
  track: GenTrack,
  completed: Exercise[],
): { doneIds: Set<string>; next: GenStep | null; finished: boolean } {
  const doneIds = new Set(trackRows(track, completed).map((e) => stepIdOf(e)!));
  const next = track.steps.find((s) => !doneIds.has(s.id) && !s.skipped) ?? null;
  return { doneIds, next, finished: next === null };
}

/** True when nothing in the track was finished for STALE_DAYS (counted from the start if nothing was). */
export function isStale(track: GenTrack, completed: Exercise[], today: string): boolean {
  const last = trackRows(track, completed)
    .map((e) => e.completedAt!)
    .sort()
    .at(-1);
  return addDays(localDay(new Date(last ?? track.startedAt)), STALE_DAYS) <= today;
}

/** The recap saved when a track closes. `past` is newest first. */
export function closeTrack(
  track: GenTrack,
  completed: Exercise[],
  past: TrackRecap[],
  reason: TrackRecap["closeReason"],
  now: string,
): TrackRecap {
  const rows = trackRows(track, completed);
  const { doneIds } = genTrackProgress(track, completed);
  const ratings = { good: 0, ok: 0, poor: 0 };
  for (const r of rows) {
    const rating = rateExercise(r);
    if (rating) ratings[rating] += 1;
  }
  const during = tallyRows(rows);
  const targets = track.targets.map((key): TrackRecapTarget => {
    const d = during.get(key) ?? ZERO;
    const below = d.chances > 0 && !isWeak(d);
    const prev = past.flatMap((r) => r.targets).find((t) => t.key === key);
    return { key, before: track.baseline[key] ?? ZERO, during: d, below, cleared: below && !!prev?.below };
  });
  return {
    id: track.id,
    n: track.n,
    startedAt: track.startedAt,
    closedAt: now,
    closeReason: reason,
    done: doneIds.size,
    skipped: track.steps.filter((s) => s.skipped && !doneIds.has(s.id)).length,
    total: track.steps.length,
    ratings,
    targets,
  };
}

/** Add a recap to the list, newest first, keeping PAST_KEEP. */
export function withRecap(past: TrackRecap[], recap: TrackRecap): TrackRecap[] {
  return [recap, ...past.filter((r) => r.id !== recap.id)].slice(0, PAST_KEEP);
}

/** Where a step's Start goes. A redo step has no link: it calls `startRedo` instead. */
export function stepHref(step: GenStep): string {
  const q = new URLSearchParams();
  if (step.kind === "own") q.set("source", "custom_scenario");
  else if (step.domain) q.set("domain", step.domain);
  if (step.focus) q.set("focus", step.focus);
  q.set("step", step.id);
  return `/exercise/${step.type}?${q.toString()}`;
}

/** The track with one step marked skipped. */
export function skipStep(track: GenTrack, stepId: string): GenTrack {
  return { ...track, steps: track.steps.map((s) => (s.id === stepId ? { ...s, skipped: true } : s)) };
}

/** The unfinished exercise that belongs to a step, if any. */
export function exerciseForGenStep(incomplete: Exercise[], step: GenStep | null): Exercise | undefined {
  return step ? incomplete.find((e) => stepIdOf(e) === step.id) : undefined;
}
