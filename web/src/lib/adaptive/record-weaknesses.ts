import { scoreEmbeddedIssueCatch } from "@/lib/analytics/analytical-per-issue";
import { computeEvaluativeAccuracy } from "@/lib/analytics/calibration-evaluative";
import { computeSequentialAccuracy } from "@/lib/analytics/calibration-sequential";
import { computeSystemsAccuracy } from "@/lib/analytics/calibration-systems";
import { recordHit, upsertMiss } from "@/lib/db/weaknesses";
import { getAppSettings } from "@/lib/db/settings";
import {
  type AnalyticalExerciseRow,
  type ConfidenceRecord,
  type EvaluativeExerciseRow,
  type Exercise,
  type GenerativeExerciseRow,
  type SequentialExerciseRow,
  type SystemsExerciseRow,
  isAnalyticalExercise,
  isComboExercise,
  isEvaluativeExercise,
  isGenerativeExercise,
  isSequentialExercise,
  isSystemsExercise,
} from "@/lib/types/exercise";
import { WEAKNESS_BUCKET, type WeaknessThinkingGroup } from "@/lib/types/weakness";

const ANALYTICAL_CATCH_THRESHOLD = 58;

const SEQ_HIT = 85;
const SEQ_MISS = 72;
const SYS_HIT = 85;
const SYS_MISS = 70;
const EV_HIT = 82;
const EV_MISS = 65;
const GEN_HIT = 78;
const GEN_MISS = 62;

function groupIssuesByType<T extends { type: string }>(issues: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of issues) {
    const arr = m.get(i.type) ?? [];
    arr.push(i);
    m.set(i.type, arr);
  }
  return m;
}

async function recordAnalytical(ex: AnalyticalExerciseRow) {
  if (ex.embeddedIssues.length === 0) return;
  const byType = groupIssuesByType(ex.embeddedIssues);
  for (const [t, issues] of byType) {
    const allCaught = issues.every(
      (issue) => scoreEmbeddedIssueCatch(ex.passage, issue, ex.userHighlights) >= ANALYTICAL_CATCH_THRESHOLD,
    );
    const g = "analytical" as const;
    if (allCaught) await recordHit(g, t);
    else await upsertMiss(g, t);
  }
}

async function recordSequential(ex: SequentialExerciseRow) {
  const acc = computeSequentialAccuracy(ex.steps, ex.userOrderedStepIds);
  const g: WeaknessThinkingGroup = "sequential";
  const b = WEAKNESS_BUCKET.sequential;
  if (acc >= SEQ_HIT) await recordHit(g, b);
  else if (acc < SEQ_MISS) await upsertMiss(g, b);
}

async function recordSystems(ex: SystemsExerciseRow) {
  const acc = computeSystemsAccuracy({
    intendedConnections: ex.intendedConnections,
    userEdges: ex.userEdges,
    shock: ex.shockEvent,
    nodeImpact: ex.nodeImpact,
  });
  const g: WeaknessThinkingGroup = "systems";
  const b = WEAKNESS_BUCKET.systems;
  if (acc >= SYS_HIT) await recordHit(g, b);
  else if (acc < SYS_MISS) await upsertMiss(g, b);
}

async function recordEvaluative(ex: EvaluativeExerciseRow) {
  const acc = computeEvaluativeAccuracy(ex);
  const g: WeaknessThinkingGroup = "evaluative";
  const b =
    ex.variant === "matrix" ? WEAKNESS_BUCKET.evaluativeMatrix : WEAKNESS_BUCKET.evaluativeScoring;
  if (acc >= EV_HIT) await recordHit(g, b);
  else if (acc < EV_MISS) await upsertMiss(g, b);
}

async function recordGenerative(ex: GenerativeExerciseRow, confidence: ConfidenceRecord | null) {
  const raw = ex.rubricScore ?? confidence?.actualAccuracy;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return;
  const acc = raw;
  const g: WeaknessThinkingGroup = "generative";
  const b = WEAKNESS_BUCKET.generative;
  if (acc >= GEN_HIT) await recordHit(g, b);
  else if (acc < GEN_MISS) await upsertMiss(g, b);
}

async function recordSingle(exercise: Exercise, confidence: ConfidenceRecord | null): Promise<void> {
  if (isAnalyticalExercise(exercise)) {
    await recordAnalytical(exercise);
    return;
  }
  if (isSequentialExercise(exercise)) {
    await recordSequential(exercise);
    return;
  }
  if (isSystemsExercise(exercise)) {
    await recordSystems(exercise);
    return;
  }
  if (isEvaluativeExercise(exercise)) {
    await recordEvaluative(exercise);
    return;
  }
  if (isGenerativeExercise(exercise)) {
    await recordGenerative(exercise, confidence);
  }
}

export async function recordWeaknessesAfterExercise(
  exercise: Exercise,
  confidence: ConfidenceRecord,
): Promise<void> {
  const settings = await getAppSettings();
  if (settings.adaptiveDifficultyEnabled !== true) return;

  if (isComboExercise(exercise)) {
    for (const sub of exercise.subExercises) {
      await recordSingle(sub, null);
    }
    return;
  }
  await recordSingle(exercise, confidence);
}
