import { ALT_ROUTES, type Chokepoint, type RouteId } from "@/lib/geo/chokepoints";
import { countryName } from "@/lib/geo/countries";
import type { StraitResult } from "@/lib/geo/strait";
import { GEO_FACT_RULE } from "@/lib/ai/prompts/geo-rules";

const names = (ids: string[]) => (ids.length ? ids.map((id) => countryName(id) ?? id).join(", ") : "none");

/**
 * The fixed facts for one chokepoint, as plain lines. They are the only facts the
 * AI may use; the validator also checks its numbers against this text.
 */
export function straitFactsText(cp: Chokepoint): string {
  const g = cp.game;
  const lines = [
    `${cp.name} connects ${cp.connects}.`,
    cp.why,
    `What passes: ${cp.goods}`,
    ...cp.facts.map((f) => `${f.label}: ${f.value}.`),
  ];
  if (g) {
    lines.push(`Countries that depend on it most: ${names(g.dependents)}. ${g.dependentsWhy}`);
    lines.push(`The way around it: ${ALT_ROUTES[g.route].label}. ${g.detour.text}`);
  }
  return lines.map((l) => `- ${l}`).join("\n");
}

/** "Close the strait" (PLAN-geopolitics.md G2): a short note on the learner's guess. */
export function buildGeoStraitPrompt(input: { cp: Chokepoint; result: StraitResult; route: RouteId | null }): string {
  const { cp, result, route } = input;
  const routeLine = route
    ? `"${ALT_ROUTES[route].label}" (${result.routeCorrect ? "right" : "not the main way around"})`
    : "no guess";
  return `You are a patient geography coach for a beginner learning geopolitics.
The learner played "Close the strait": they imagined that the ${cp.name} was closed. They guessed which countries would be hit hardest and how ships or oil would get around it. The app has already scored the guess and shown the answer.

FIXED FACTS (from checked sources; the only facts you may use):
${straitFactsText(cp)}

THE LEARNER'S GUESS:
- Countries they picked that are on the list: ${names(result.found)}
- Countries on the list they missed: ${names(result.missed)}
- Countries they picked that are not on the list: ${names(result.extra)}
- Their guess for the way around: ${routeLine}

Write a short, friendly note that helps them remember the lesson.
- "summary": 1-2 short sentences. Say honestly how the guess went, then the one idea to remember about this strait.
- "points": 2-3 short sentences. Each explains one cause and effect from the FIXED FACTS, e.g. why a country they missed depends on the strait, why a country they picked is less exposed, or why the way around is slow or small.

RULES:
- Use only the FIXED FACTS. Do not add any number, date, name, or event that is not in them. If a point needs a fact you do not have, leave the point out.
- Do not make a fact stronger than it is: no "entirely", "only", "always" or "never" unless a fact says so, and no guesses about how hard an economy would be hit.
- Do not take sides in any political dispute, and do not predict what any government will do.
- English only. Plain words. Keep every sentence under 20 words.
${GEO_FACT_RULE}

Return ONLY a JSON object: { "summary": string, "points": string[] }.`;
}
