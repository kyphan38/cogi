import type { ClassicGameType, StrategyLevelConfig } from "@/lib/exercise/strategy-levels";
import { GEO_GAME_LABELS, type GeoGameCase, type GeoGameType } from "@/lib/geo/game-cases";
import { GEO_FACT_RULE } from "@/lib/ai/prompts/geo-rules";

/** A strategic situation: a real story that is a 2-player game, with terms to learn first. */
export function buildStrategyGenerationPrompt(input: {
  area: string;
  level: StrategyLevelConfig;
  userContext?: string;
  adaptationAppendix?: string;
  /** Picked in code for 2x2 levels (pickStrategyGameType); the model must write this game. */
  gameType?: ClassicGameType;
}): string {
  const n = input.level.aOptionCount;
  const g = input.gameType;
  const what = g ? `a real-life game with the shape of ${CLASSIC_LABELS[g]}` : input.level.gameTypes;
  const gameTypeField = g ? `"${g}"` : "string (prisoners_dilemma, coordination, chicken, stag_hunt or other)";
  const shapeRule = g
    ? `- The payoffs must have this shape: ${CLASSIC_SHAPE_HINTS[g]}`
    : `- If gameType is a classic (prisoners_dilemma, coordination, chicken, stag_hunt), the payoffs must really have that shape: a prisoner's dilemma has a dominant choice for each side and an outcome better for both; chicken, stag hunt and coordination have two equilibria and no dominant choice. Otherwise use "other".`;
  const aIds = Array.from({ length: n }, (_, i) => `a${i + 1}`).join(", ");
  const ctx = input.userContext?.trim() ? `\nUser context (optional): ${input.userContext.trim()}` : "";
  return `You are writing a beginner-friendly game theory exercise.${ctx}

Write ${what}, set in this area: ${input.area}. Tell it as a short real-life story (${input.level.scenarioWords} words) with two players who decide at the same time without talking. Player A has ${n} choices, player B has 2.

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "title": string,
  "scenario": string,
  "concepts": [ { "term": string, "plain": string (one simple sentence), "example": string (one everyday example) } ] (exactly 3 game theory ideas needed here, e.g. "best reply", "Nash equilibrium", "dominant strategy", "payoff"),
  "conceptChecks": [ { "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string } ] (exactly 1),
  "players": [ { "id": "A", "name": string, "goal": string }, { "id": "B", "name": string, "goal": string } ],
  "optionsA": [ { "id": "a1", "label": string (2-5 words) } ] (ids ${aIds}),
  "optionsB": [ { "id": "b1", "label": string }, { "id": "b2", "label": string } ],
  "cells": [ { "a": string, "b": string, "payoffA": integer 0-10, "payoffB": integer 0-10, "story": string (one sentence: what happens to both) } ] (one per pair of choices),
  "gameType": ${gameTypeField},
  "insight": string (the lesson of this game in 1-2 plain sentences)
}

Rules:
${STORY_FACTS_RULE}
- Payoffs are how good the outcome is for that player (10 = best). They must match the cell stories: a careful reader who uses the facts in the scenario and the cell stories can rank the outcomes for each player.
- No ties: for each choice of B, A's payoffs must all differ; for each choice of A, B's payoffs must differ.
- There must be at least one cell where both players are making their best reply.
${shapeRule}
- Keep it concrete and plain. Do not name the game type in the scenario. Pick fresh names that fit the area (not Maya, Leo, Liam or Ben).${input.adaptationAppendix ? `\n\n${input.adaptationAppendix}` : ""}`;
}

/**
 * The learner works out each outcome, so the scenario gives facts (goals, costs,
 * limits) and never walks through the outcomes; cell stories state facts, and words
 * like "disaster" or "great" would give the ranking away.
 */
const STORY_FACTS_RULE = `- The scenario gives the facts each player weighs: what each wants, prices, costs, time, rules and limits. It must NOT say what happens in any outcome (no "if both ..., then ...", no "if one ... while the other ..."). Working out the outcomes is the learner's job.
- Each cell story states concrete facts only: money, time, customers, grades, who gets what. No feeling or judgment words (great, disaster, happy, furious, lucky, worst, best, wasted). The ranking must come from the facts, not from the tone.`;

const CLASSIC_LABELS: Record<ClassicGameType, string> = {
  prisoners_dilemma: "a prisoner's dilemma",
  coordination: "a coordination game",
  chicken: "a game of chicken",
  stag_hunt: "a stag hunt",
};

/**
 * Geopolitical games (PLAN-geopolitics.md G3): a made-up story with the same game as a
 * real case. The real case is only background; its facts are shown by the app, never
 * retold by the AI. Always 2 choices per side, so the classic shape can be checked.
 */
export function buildGeoStrategyPrompt(input: {
  gameCase: GeoGameCase;
  level: StrategyLevelConfig;
  adaptationAppendix?: string;
}): string {
  const c = input.gameCase;
  return `You are writing a beginner-friendly game theory exercise about geopolitics.

REAL CASE (background only - do not retell it, do not name it):
${c.title} (${c.when}). ${c.summary}
Side A was ${c.players.A.name} (choices: ${c.players.A.choices.join(" / ")}). Side B was ${c.players.B.name} (choices: ${c.players.B.choices.join(" / ")}).
The game it teaches: ${GEO_GAME_LABELS[c.gameType]}. ${c.lesson}

Write a MADE-UP story (${input.level.scenarioWords} words) with the same game: two made-up countries or groups that face the same kind of choice at the same time, without talking. Player A plays the role of ${c.players.A.name}; player B plays the role of ${c.players.B.name}.

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "title": string,
  "scenario": string (must start with "Suppose"),
  "concepts": [ { "term": string, "plain": string (one simple sentence), "example": string (one everyday example) } ] (exactly 3: two game theory ideas such as "best reply", "Nash equilibrium" or "dominant strategy", and one geopolitics idea that fits, such as "deterrence", "credible commitment", "free rider" or "entrapment"),
  "conceptChecks": [ { "question": string, "options": [string, string, string], "answerIndex": 0 | 1 | 2, "explanation": string } ] (exactly 1),
  "players": [ { "id": "A", "name": string, "goal": string }, { "id": "B", "name": string, "goal": string } ],
  "optionsA": [ { "id": "a1", "label": string (2-5 words) }, { "id": "a2", "label": string } ],
  "optionsB": [ { "id": "b1", "label": string }, { "id": "b2", "label": string } ],
  "cells": [ { "a": string, "b": string, "payoffA": integer 0-10, "payoffB": integer 0-10, "story": string (one sentence: what happens to both) } ] (4 cells, one per pair),
  "gameType": "${c.gameType}",
  "insight": string (the lesson in 1-2 plain sentences, about the made-up story)
}

Rules:
- Use made-up names only (for example "Norland" and "Estova"). Never use real countries, leaders, places, groups, dates or events.
- Payoffs are how good the outcome is for that player (10 = best). They must match the story and give the game its shape: ${GEO_SHAPE_HINTS[c.gameType]}
- No ties: for each choice of B, A's two payoffs differ; for each choice of A, B's two payoffs differ.
- Do not name the game type in the scenario.
${GEO_FACT_RULE}${input.adaptationAppendix ? `\n\n${input.adaptationAppendix}` : ""}`;
}

const CLASSIC_SHAPE_HINTS: Record<ClassicGameType, string> = {
  prisoners_dilemma:
    "each side has a dominant choice (the selfish one), so they end up in one equilibrium where both are selfish, yet both holding back would be better for BOTH.",
  coordination:
    "both sides gain most when their choices match; there are two matching equilibria (the two sides may prefer different ones), mismatched choices are worse for both, and no side has a dominant choice.",
  chicken:
    "both standing firm is the worst for both; if one backs down, the one who stands firm does best; there are two equilibria (one side firm, the other backs down) and no side has a dominant choice.",
  stag_hunt:
    "both cooperating is best for both; cooperating alone is worst for the one who does it; both playing safe is a stable but poorer outcome; there are two equilibria and no side has a dominant choice.",
};

const GEO_SHAPE_HINTS: Record<GeoGameType, string> = {
  chicken:
    "both standing firm is the worst for both; if one backs down, the one who stands firm does best; each side prefers the outcome where it stands firm and the other backs down.",
  prisoners_dilemma:
    "the selfish choice is best for each side whatever the other does, so they end up both selfish, yet both holding back would be better for BOTH.",
  free_rider:
    "for player B (the outsider) free riding is best whatever A does; player A does best if B joins the effort.",
  stag_hunt:
    "both cooperating is best for both; cooperating alone is worst for the one who does it; both playing safe is a stable but poorer outcome.",
  alliance:
    "player A's firm backing makes B more willing to take a hard line; a hard line by B risks a wider war that hurts A; there must be at least one outcome where both play their best reply.",
};
