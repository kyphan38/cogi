import type { StrategyLevelConfig } from "@/lib/exercise/strategy-levels";

/** A strategic situation: a real story that is a 2-player game, with terms to learn first. */
export function buildStrategyGenerationPrompt(input: {
  area: string;
  level: StrategyLevelConfig;
  userContext?: string;
  adaptationAppendix?: string;
}): string {
  const n = input.level.aOptionCount;
  const aIds = Array.from({ length: n }, (_, i) => `a${i + 1}`).join(", ");
  const ctx = input.userContext?.trim() ? `\nUser context (optional): ${input.userContext.trim()}` : "";
  return `You are writing a beginner-friendly game theory exercise.${ctx}

Write ${input.level.gameTypes}, set in this area: ${input.area}. Tell it as a short real-life story (${input.level.scenarioWords} words) with two players who decide at the same time without talking. Player A has ${n} choices, player B has 2.

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
  "gameType": string (prisoners_dilemma, coordination, chicken, stag_hunt or other),
  "insight": string (the lesson of this game in 1-2 plain sentences)
}

Rules:
- Payoffs are how good the outcome is for that player (10 = best). They must match the story: someone reading only the cell stories should be able to tell what each player prefers.
- No ties: for each choice of B, A's payoffs must all differ; for each choice of A, B's payoffs must differ.
- There must be at least one cell where both players are making their best reply.
- Keep it concrete and plain. Do not name the game type in the scenario.${input.adaptationAppendix ? `\n\n${input.adaptationAppendix}` : ""}`;
}
