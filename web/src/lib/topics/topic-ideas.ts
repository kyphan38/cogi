import { EXERCISE_DOMAIN_CATALOG, type ExerciseDomainGroup } from "@/lib/exercise/exercise-domain-catalog";
import { GEOPOLITICS_DOMAIN_GROUPS } from "@/lib/exercise/geopolitics-domains";
import { CALIBRATION_CATEGORIES } from "@/lib/exercise/calibration-bank";
import type { ThinkingType } from "@/lib/types/exercise";

/**
 * Topic ideas (PLAN-topic-ideas.md T1): the rules the code enforces on AI topic lists.
 * The AI suggests; the code decides what is kept.
 */

/** Modes the AI writes topics for. Calibration uses its own question bank instead. */
export const AI_TOPIC_MODES = ["analytical", "systems", "evaluative", "judgment", "strategy", "reframe"] as const;
export type AiTopicMode = (typeof AI_TOPIC_MODES)[number];

export const TOPIC_IDEA_COUNT = 10;
/** With "All modes", no mode may take more than this many rows (more if few modes fit)... */
export const MAX_PER_MODE = 2;
/** ...and the list must cover at least this many modes (fewer if fewer fit). */
export const MIN_MODES = 4;

/** Geopolitics groups have no `bestFor` in the catalog; these are the modes with geo variants. */
const GEO_MODES: readonly ThinkingType[] = ["analytical", "systems", "evaluative", "strategy"];

export interface TopicGroup {
  id: string;
  label: string;
  domains: string[];
  /** AI modes that fit this group. */
  modes: AiTopicMode[];
}

const isAiMode = (m: string): m is AiTopicMode => (AI_TOPIC_MODES as readonly string[]).includes(m);

function toTopicGroup(g: ExerciseDomainGroup, fallback: readonly ThinkingType[]): TopicGroup {
  return {
    id: g.id,
    label: g.label,
    domains: g.domains.filter((d) => d !== "Custom domain"),
    modes: (g.bestFor ?? fallback).filter(isAiMode),
  };
}

/** Every domain group the filters offer, with the AI modes that fit it. */
export const TOPIC_GROUPS: TopicGroup[] = [
  ...EXERCISE_DOMAIN_CATALOG.map((g) => toTopicGroup(g, [])),
  ...GEOPOLITICS_DOMAIN_GROUPS.map((g) => toTopicGroup(g as ExerciseDomainGroup, GEO_MODES)),
].filter((g) => g.modes.length > 0 && g.domains.length > 0);

export function topicGroupById(id: string | undefined): TopicGroup | undefined {
  return id ? TOPIC_GROUPS.find((g) => g.id === id) : undefined;
}

/** The group a catalog domain belongs to (exact match). */
export function topicGroupOfDomain(domain: string | undefined): TopicGroup | undefined {
  const d = domain?.trim();
  return d ? TOPIC_GROUPS.find((g) => g.domains.includes(d)) : undefined;
}

/** Groups that fit a mode ("A mode" shows only these). */
export function groupsForMode(mode: AiTopicMode): TopicGroup[] {
  return TOPIC_GROUPS.filter((g) => g.modes.includes(mode));
}

export interface TopicIdeaRequest {
  mode: AiTopicMode | "all";
  /** A group id from TOPIC_GROUPS, or none for "Any". */
  groupId?: string;
  /** A domain inside the group, or none for any domain of the group. */
  domain?: string;
  /** Titles to avoid: topics already practised and the list on screen. */
  exclude: string[];
}

export interface TopicIdea {
  title: string;
  mode: ThinkingType;
  groupId: string;
  domain: string;
}

/** The raw shape asked from the AI. */
export interface RawTopicIdea {
  title: string;
  mode: string;
  group: string;
  domain: string;
}

/** How many AI modes the request allows. */
function modesAllowed(req: TopicIdeaRequest): number {
  if (req.mode !== "all") return 1;
  return topicGroupById(req.groupId)?.modes.length ?? AI_TOPIC_MODES.length;
}

/** Rows one mode may take with "All modes": 2, or more when few modes fit (geopolitics: 3). */
export function perModeCap(req: TopicIdeaRequest): number {
  return Math.max(MAX_PER_MODE, Math.ceil(TOPIC_IDEA_COUNT / modesAllowed(req)));
}

/** Different modes a full "All modes" list should cover. */
export function minModes(req: TopicIdeaRequest): number {
  return Math.min(MIN_MODES, modesAllowed(req));
}

/** Problems with a request, for a 400 response. Empty when it is valid. */
export function requestErrors(r: TopicIdeaRequest): string[] {
  const errors: string[] = [];
  if (r.mode !== "all" && !isAiMode(r.mode)) errors.push(`Unknown mode "${r.mode}"`);
  const group = topicGroupById(r.groupId);
  if (r.groupId && !group) errors.push(`Unknown group "${r.groupId}"`);
  if (r.domain && (!group || !group.domains.includes(r.domain))) errors.push(`"${r.domain}" is not a domain of the chosen group`);
  if (group && r.mode !== "all" && !group.modes.includes(r.mode)) errors.push(`The mode "${r.mode}" does not fit "${group.label}"`);
  return errors;
}

/** Same words, ignoring case, spaces and punctuation at the ends. */
export function titleKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VIETNAMESE = /[ăĂđĐơƠưƯẠ-ỹ]/;

/**
 * Keep only ideas that follow the rules, in the AI's order: a known mode that fits the
 * group, inside the chosen group / domain, a sensible length, English only, not
 * excluded, not repeated. With "All modes", at most `perModeCap` rows per mode.
 */
export function keepValidIdeas(raw: RawTopicIdea[], req: TopicIdeaRequest, already: TopicIdea[] = []): TopicIdea[] {
  const banned = new Set([...req.exclude, ...already.map((i) => i.title)].map(titleKey));
  const perMode = new Map<string, number>();
  for (const i of already) perMode.set(i.mode, (perMode.get(i.mode) ?? 0) + 1);
  const out: TopicIdea[] = [];
  for (const r of raw) {
    const title = r.title?.trim() ?? "";
    const words = title.split(/\s+/).filter(Boolean).length;
    if (words < 4 || words > 18 || VIETNAMESE.test(title)) continue;
    if (!isAiMode(r.mode)) continue;
    if (req.mode !== "all" && r.mode !== req.mode) continue;
    const group = topicGroupById(req.groupId ?? r.group);
    if (!group || !group.modes.includes(r.mode)) continue;
    const domain = req.domain ?? (group.domains.includes(r.domain?.trim()) ? r.domain.trim() : group.domains[0]!);
    const k = titleKey(title);
    if (!k || banned.has(k)) continue;
    if (req.mode === "all" && (perMode.get(r.mode) ?? 0) >= perModeCap(req)) continue;
    banned.add(k);
    perMode.set(r.mode, (perMode.get(r.mode) ?? 0) + 1);
    out.push({ title, mode: r.mode, groupId: group.id, domain });
  }
  return out;
}

/** How many different modes a list covers. */
export function modeCount(ideas: TopicIdea[]): number {
  return new Set(ideas.map((i) => i.mode)).size;
}

/** Calibration "topics" are the categories of its own question bank. */
export function calibrationIdeas(): TopicIdea[] {
  return CALIBRATION_CATEGORIES.map((c) => ({
    title: `How sure are you? Questions about ${c}`,
    mode: "calibration" as const,
    groupId: "calibration",
    domain: c,
  }));
}

/**
 * With "All modes" and no domain chosen, the list may hold one Calibration row (half
 * of the time), from the question bank. It takes the last AI slot, so the list stays 10.
 */
export function withCalibrationSlot(ideas: TopicIdea[], req: TopicIdeaRequest, rand: () => number = Math.random): TopicIdea[] {
  if (req.mode !== "all" || req.groupId || rand() >= 0.5) return ideas.slice(0, TOPIC_IDEA_COUNT);
  const options = calibrationIdeas().filter((c) => !req.exclude.map(titleKey).includes(titleKey(c.title)));
  if (options.length === 0) return ideas.slice(0, TOPIC_IDEA_COUNT);
  const pick = options[Math.floor(rand() * options.length) % options.length]!;
  return [...ideas.slice(0, TOPIC_IDEA_COUNT - 1), pick];
}
