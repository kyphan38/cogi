/**
 * Shared by every geopolitics prompt (PLAN-geopolitics.md G1.5): an AI-written
 * scenario must never pass off invented facts as real ones.
 */
export const GEO_FACT_RULE = `FACT SAFETY (important):
- Use only facts that are widely established (well-known geography, dates, events, institutions).
- Never invent statistics, dates, quotes, or treaty details, and never attribute words to a real, named person.
- Anything hypothetical must read as hypothetical: start it with "Suppose" or use clearly made-up names (e.g. "Country A").
- If you need a number to illustrate a point, round it and call it an illustration ("roughly", "for example").`;
