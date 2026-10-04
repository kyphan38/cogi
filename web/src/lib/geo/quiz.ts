import { distanceToTargetKm } from "@/lib/geo/geometry";
import { PLACES, type Place } from "@/lib/geo/places";
import type { LonLat } from "@/lib/geo/types";

/** Questions in one daily map quiz (about two minutes). */
export const QUIZ_LENGTH = 5;

/**
 * Days until a missed place comes back: 1 day after a miss, then 3 days, then 7
 * days. A miss at any step starts again at 1 day; three right answers in a row
 * finish the review.
 */
export const REVIEW_INTERVALS = [1, 3, 7] as const;

/** One answered question, saved on the quiz row. */
export interface GeoQuizAnswer {
  placeId: string;
  /** Where the user tapped; null when they chose "I don't know". */
  tap: LonLat | null;
  /** Distance to the place in km, rounded; null when there was no tap. */
  distanceKm: number | null;
  /** A sea question tapped on land. */
  onLand?: boolean;
  correct: boolean;
}

/** Score one tap. Sea questions never count a tap on land. */
export function scoreTap(place: Place, tap: LonLat | null, onLand = false): GeoQuizAnswer {
  if (!tap) return { placeId: place.id, tap: null, distanceKm: null, correct: false };
  const d = distanceToTargetKm(tap, place.target);
  const landMiss = place.kind === "sea" && onLand;
  return {
    placeId: place.id,
    tap,
    distanceKm: Math.round(d),
    ...(landMiss ? { onLand: true } : {}),
    correct: d <= place.toleranceKm && !landMiss,
  };
}

/** Local calendar day, "YYYY-MM-DD" (same rule as the streak). */
export function localDay(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** One past answer, in the order it was given. */
export interface QuizAttempt {
  placeId: string;
  correct: boolean;
  day: string;
}

/** Where a missed place stands in its review; `due` is the day it comes back. */
export interface ReviewState {
  step: number;
  due: string;
}

/** Review state per place after all attempts (places not in review are absent). */
export function reviewSchedule(attempts: QuizAttempt[]): Map<string, ReviewState> {
  const state = new Map<string, ReviewState>();
  for (const a of attempts) {
    const cur = state.get(a.placeId);
    if (!a.correct) {
      state.set(a.placeId, { step: 0, due: addDays(a.day, REVIEW_INTERVALS[0]) });
    } else if (cur) {
      const next = cur.step + 1;
      if (next >= REVIEW_INTERVALS.length) state.delete(a.placeId);
      else state.set(a.placeId, { step: next, due: addDays(a.day, REVIEW_INTERVALS[next]!) });
    }
  }
  return state;
}

/** Small stable hash, so the order of new places changes by day but not by reload. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The places for a quiz on `today`: reviews that are due first (oldest first), then
 * places never asked (easy levels first, mixed kinds), then the places seen longest
 * ago. `exclude` skips places already asked today.
 */
export function pickQuizPlaces(input: {
  attempts: QuizAttempt[];
  today: string;
  count?: number;
  exclude?: Set<string>;
  places?: Place[];
}): Place[] {
  const { attempts, today } = input;
  const count = input.count ?? QUIZ_LENGTH;
  const places = (input.places ?? PLACES).filter((p) => !input.exclude?.has(p.id));
  const schedule = reviewSchedule(attempts);
  const lastSeen = new Map<string, string>();
  for (const a of attempts) lastSeen.set(a.placeId, a.day);

  const picked: Place[] = [];
  const take = (p: Place) => {
    if (picked.length < count && !picked.includes(p)) picked.push(p);
  };

  places
    .filter((p) => {
      const s = schedule.get(p.id);
      return s != null && s.due <= today;
    })
    .sort((a, b) => schedule.get(a.id)!.due.localeCompare(schedule.get(b.id)!.due) || a.id.localeCompare(b.id))
    .forEach(take);

  const fresh = places
    .filter((p) => !lastSeen.has(p.id))
    .sort((a, b) => a.level - b.level || hash(today + a.id) - hash(today + b.id));
  while (picked.length < count && fresh.some((p) => !picked.includes(p))) {
    const kinds = new Set(picked.map((p) => p.kind));
    const left = fresh.filter((p) => !picked.includes(p));
    const easiest = left.filter((p) => p.level === left[0]!.level);
    take(easiest.find((p) => !kinds.has(p.kind)) ?? easiest[0]!);
  }

  places
    .filter((p) => lastSeen.has(p.id) && !schedule.has(p.id))
    .sort((a, b) => lastSeen.get(a.id)!.localeCompare(lastSeen.get(b.id)!) || hash(today + a.id) - hash(today + b.id))
    .forEach(take);

  return picked;
}

/** How many places are in review, and how many of them are due by `today`. */
export function reviewCounts(attempts: QuizAttempt[], today: string): { inReview: number; due: number } {
  const schedule = reviewSchedule(attempts);
  let due = 0;
  for (const s of schedule.values()) if (s.due <= today) due += 1;
  return { inReview: schedule.size, due };
}
