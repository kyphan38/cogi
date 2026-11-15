import { catalogGroupOf } from "@/lib/exercise/exercise-domain-catalog";
import { isRealWorldTrackDomain } from "@/lib/exercise/tracks";
import { REAL_WORLD_FACT_RULE, STORY_FACT_RULE } from "@/lib/ai/prompts/geo-rules";

/** Catalog groups whose every domain is about real institutions and events. */
const REAL_WORLD_GROUPS = new Set(["us-politics"]);

/** Single catalog domains about real institutions and events (other groups). */
const REAL_WORLD_DOMAINS = new Set([
  "US interest rates & the VND exchange rate",
  "State Bank of Vietnam & interest rates",
  "Vietnam's state budget & public sector pay",
  "State-set prices in Vietnam (electricity, fuel)",
  "Public investment in Vietnam (expressways, airports)",
  "Big fraud cases in Vietnam: how they worked",
  "Charity donations & transparency in Vietnam",
  "Living costs: Vietnam vs working abroad",
]);

/** Strategy quick-pick areas (not catalog domains) where real countries and deals come up. */
const REAL_WORLD_AREAS = new Set(["Countries & trade"]);

/**
 * True when an AI-written exercise on this topic could pass off invented facts as
 * real ones, so its prompt needs the fact-safety rule (PLAN-society.md S1).
 */
export function isRealWorldTopic(domain: string): boolean {
  const d = domain.trim();
  const group = catalogGroupOf(d);
  return (group !== undefined && REAL_WORLD_GROUPS.has(group.id)) || REAL_WORLD_DOMAINS.has(d) || REAL_WORLD_AREAS.has(d) || isRealWorldTrackDomain(d);
}

export const REAL_WORLD_CATALOG_DOMAINS: ReadonlySet<string> = REAL_WORLD_DOMAINS;

/**
 * The fact-safety rule for a generated exercise: the strict one for topics about real
 * institutions and events, the general one for everything else.
 */
export function factRuleFor(domain: string): string {
  return isRealWorldTopic(domain) ? REAL_WORLD_FACT_RULE : STORY_FACT_RULE;
}
