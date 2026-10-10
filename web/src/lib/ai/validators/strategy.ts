import { z } from "zod";
import { analyzeGame } from "@/lib/exercise/game";
import { classicGameShapeErrors, geoGameShapeErrors, realNamesUsed } from "@/lib/exercise/geo-game-shape";
import type { GeoGameCase } from "@/lib/geo/game-cases";

const conceptSchema = z.object({ term: z.string().min(1), plain: z.string().min(1), example: z.string().min(1) });
const checkSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()),
  answerIndex: z.number().int(),
  explanation: z.string().min(1),
});
const playerSchema = z.object({ id: z.enum(["A", "B"]), name: z.string().min(1), goal: z.string().min(1) });
const optionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });
const cellSchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1),
  payoffA: z.number().int(),
  payoffB: z.number().int(),
  /** What happens in this outcome, one sentence. */
  story: z.string().min(1),
});

/** A generated strategic situation: a 2-player game in a real-life story. */
export const strategyExerciseSchema = z.object({
  title: z.string().min(1),
  scenario: z.string().min(1),
  concepts: z.array(conceptSchema),
  conceptChecks: z.array(checkSchema),
  players: z.array(playerSchema),
  optionsA: z.array(optionSchema),
  optionsB: z.array(optionSchema),
  cells: z.array(cellSchema),
  /** Classic shape, e.g. prisoners_dilemma, coordination, chicken, stag_hunt, other. */
  gameType: z.string().min(1),
  /** The lesson of this game in one or two sentences. */
  insight: z.string().min(1),
});

export type StrategyExercisePayload = z.infer<typeof strategyExerciseSchema>;
export type StrategyCell = z.infer<typeof cellSchema>;

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m?.[1] ? m[1].trim() : trimmed;
}

export function parseStrategyExerciseJson(
  text: string,
): { success: true; data: StrategyExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const r = strategyExerciseSchema.safeParse(parsed);
  return r.success
    ? { success: true, data: r.data }
    : { success: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

/**
 * The game must be well formed and teachable: ids a1..an and b1..b2, one cell per
 * pair, payoffs 0-10, no ties when a player compares their own choices (so each best
 * reply is clear), and at least one pure equilibrium.
 */
export function validateStrategySemantics(data: StrategyExercisePayload, opts: { aOptionCount: number }): string[] {
  const errors: string[] = [];
  if (data.concepts.length < 3 || data.concepts.length > 4) errors.push("concepts must have 3-4 items");
  if (data.conceptChecks.length < 1 || data.conceptChecks.length > 2) errors.push("conceptChecks must have 1-2 items");
  data.conceptChecks.forEach((q, i) => {
    const o = q.options.map((x) => x.trim());
    if (o.length !== 3 || o.some((x) => !x) || new Set(o.map((x) => x.toLowerCase())).size !== 3) {
      errors.push(`conceptChecks[${i}]: options must be 3 different non-empty strings`);
    }
    if (q.answerIndex < 0 || q.answerIndex > 2) errors.push(`conceptChecks[${i}]: answerIndex must be 0, 1 or 2`);
  });
  if (data.players.map((p) => p.id).sort().join() !== "A,B") errors.push("players must be exactly A and B");

  const aIds = data.optionsA.map((o) => o.id);
  const bIds = data.optionsB.map((o) => o.id);
  const wantA = Array.from({ length: opts.aOptionCount }, (_, i) => `a${i + 1}`);
  if (aIds.join() !== wantA.join()) errors.push(`optionsA ids must be ${wantA.join(", ")}`);
  if (bIds.join() !== "b1,b2") errors.push("optionsB ids must be b1, b2");

  const keys = data.cells.map((c) => `${c.a}|${c.b}`);
  const wantKeys = wantA.flatMap((a) => ["b1", "b2"].map((b) => `${a}|${b}`));
  if (keys.length !== wantKeys.length || new Set(keys).size !== keys.length || !wantKeys.every((k) => keys.includes(k))) {
    errors.push(`cells must cover every pair once: ${wantKeys.join(", ")}`);
    return errors;
  }
  for (const c of data.cells) {
    if ([c.payoffA, c.payoffB].some((p) => p < 0 || p > 10)) errors.push(`cell ${c.a}|${c.b}: payoffs must be 0-10`);
  }
  const cell = (a: string, b: string) => data.cells.find((c) => c.a === a && c.b === b)!;
  for (const b of bIds) {
    const vals = aIds.map((a) => cell(a, b).payoffA);
    if (new Set(vals).size !== vals.length) errors.push(`player A has a tie when B picks ${b}; make A's payoffs differ`);
  }
  for (const a of aIds) {
    const vals = bIds.map((b) => cell(a, b).payoffB);
    if (new Set(vals).size !== vals.length) errors.push(`player B has a tie when A picks ${a}; make B's payoffs differ`);
  }
  if (errors.length === 0 && analyzeGame(aIds, bIds, data.cells).nash.length === 0) {
    errors.push("the game needs at least one pure equilibrium (a cell where both are playing their best reply)");
  }
  // Only on a complete, tie-free table: the shape check reads every cell.
  if (errors.length === 0) {
    errors.push(...classicGameShapeErrors(data.gameType, aIds, bIds, data.cells));
  }
  return errors;
}

export const STRATEGY_RETRY_SUFFIX =
  "Your previous JSON failed validation. Fix ALL issues and return ONLY the corrected JSON object.";

/**
 * Geopolitical games (PLAN-geopolitics.md G3): the usual checks with 2 choices each,
 * plus the case's game shape, a made-up story that starts with "Suppose", and no real
 * names from the case.
 */
export function validateGeoStrategySemantics(data: StrategyExercisePayload, gameCase: GeoGameCase): string[] {
  const errors = validateStrategySemantics(data, { aOptionCount: 2 });
  if (errors.length > 0) return errors;
  if (!/^suppose\b/i.test(data.scenario.trim())) errors.push('scenario must start with "Suppose" (it is a made-up story)');
  const texts = [
    data.title,
    data.scenario,
    data.insight,
    ...data.players.flatMap((p) => [p.name, p.goal]),
    ...data.optionsA.map((o) => o.label),
    ...data.optionsB.map((o) => o.label),
    ...data.cells.map((c) => c.story),
  ];
  const used = realNamesUsed(texts, gameCase.realNames);
  if (used.length) errors.push(`use made-up names only; remove: ${used.join(", ")}`);
  errors.push(...geoGameShapeErrors(gameCase.gameType, ["a1", "a2"], ["b1", "b2"], data.cells));
  return errors;
}
