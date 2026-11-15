/**
 * Shared by every geopolitics prompt (PLAN-geopolitics.md G1.5): an AI-written
 * scenario must never pass off invented facts as real ones.
 */
export const GEO_FACT_RULE = `FACT SAFETY (important):
- Use only facts that are widely established (well-known geography, dates, events, institutions).
- Never invent statistics, dates, quotes, or treaty details, and never attribute words to a real, named person.
- Anything hypothetical must read as hypothetical: start it with "Suppose" or use clearly made-up names (e.g. "Country A").
- If you need a number to illustrate a point, round it and call it an illustration ("roughly", "for example").`;

/**
 * For non-geopolitics topics about real institutions, laws and events (US politics,
 * Vietnam's economy, fraud cases). PLAN-society.md S1.
 */
export const REAL_WORLD_FACT_RULE = `FACT SAFETY (important): this topic is about real institutions and events.
- Use only facts that are widely established (how an institution works, well-known laws and events).
- Never invent statistics, dates, quotes, court findings or poll results, and never attribute words to a real, named person.
- Never say a real, named person or company did something unless it is widely reported and settled. For the story itself, prefer made-up people and companies.
- If you need a number to illustrate a point, round it and call it an illustration ("roughly", "for example").`;

/**
 * For every other generated exercise. Stories are made up, but a topic the user types
 * can name a real person or company, and the model then invents claims about them.
 */
export const STORY_FACT_RULE = `FACT SAFETY (important): readers may take what you write as fact.
- People, companies, places and sources you add are made up or generic ("a local gym", "one survey of 200 workers"). Never name a real study, university, journal, survey firm or news outlet as a source.
- If the topic names a real person, company, product or event, say only what is widely known and settled about it. Every invented detail (a number, quote, claim, complaint or event) must belong to a made-up person or company, or read as hypothetical ("Suppose ...").
- Never invent words, actions or wrongdoing for a real, named person or company.
- Use numbers about the real world (rankings, market share, national statistics) only when widely known. Other numbers stay inside the made-up story.
- Keep what the user wrote (their own situation or pasted text) as they wrote it.`;
