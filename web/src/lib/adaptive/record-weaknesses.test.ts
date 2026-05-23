import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRecordHit = vi.fn();
const mockUpsertMiss = vi.fn();
vi.mock("@/lib/db/weaknesses", () => ({
  recordHit: (...a: unknown[]) => mockRecordHit(...a),
  upsertMiss: (...a: unknown[]) => mockUpsertMiss(...a),
}));

const mockGetAppSettings = vi.fn();
vi.mock("@/lib/db/settings", () => ({
  getAppSettings: () => mockGetAppSettings(),
}));

vi.mock("@/lib/analytics/analytical-per-issue", () => ({
  scoreEmbeddedIssueCatch: vi.fn(() => 80),
}));

vi.mock("@/lib/analytics/calibration-sequential", () => ({
  computeSequentialAccuracy: vi.fn(() => 90),
}));

vi.mock("@/lib/analytics/calibration-systems", () => ({
  computeSystemsAccuracy: vi.fn(() => 90),
}));

vi.mock("@/lib/analytics/calibration-evaluative", () => ({
  computeEvaluativeAccuracy: vi.fn(() => 90),
}));

import { recordWeaknessesAfterExercise } from "./record-weaknesses";
import { scoreEmbeddedIssueCatch } from "@/lib/analytics/analytical-per-issue";
import { computeSequentialAccuracy } from "@/lib/analytics/calibration-sequential";
import { computeSystemsAccuracy } from "@/lib/analytics/calibration-systems";
import { computeEvaluativeAccuracy } from "@/lib/analytics/calibration-evaluative";
import type { ConfidenceRecord } from "@/lib/types/exercise";

const confidence: ConfidenceRecord = {
  exerciseId: "ex1",
  confidenceBefore: 50,
  confidenceAfter: 60,
  actualAccuracy: 75,
};

function analyticalExercise(opts?: { catchScore?: number }) {
  if (opts?.catchScore !== undefined) {
    vi.mocked(scoreEmbeddedIssueCatch).mockReturnValue(opts.catchScore);
  }
  return {
    type: "analytical" as const,
    id: "ex1",
    title: "T",
    domain: "tech",
    passage: "text",
    embeddedIssues: [
      { description: "i1", type: "bias", severity: "moderate" as const, textSegment: "s", explanation: "e" },
    ],
    validPoints: [],
    userHighlights: [],
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

function sequentialExercise() {
  return {
    type: "sequential" as const,
    id: "ex2",
    title: "T",
    domain: "tech",
    scenario: "s",
    steps: [{ id: "s1", text: "Step", correctPosition: 0, dependencies: [], isFlexible: false, explanation: "e" }],
    criticalErrors: [],
    userOrderedStepIds: ["s1"],
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

function systemsExercise() {
  return {
    type: "systems" as const,
    id: "ex3",
    title: "T",
    domain: "tech",
    scenario: "s",
    nodes: [{ id: "node_1", label: "N", description: "d", x: 50, y: 50 }],
    intendedConnections: [],
    shockEvent: { description: "shock", directlyAffected: ["node_1"], indirectlyAffected: [], explanation: "e" },
    userEdges: [],
    nodeImpact: {},
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

function evaluativeExercise() {
  return {
    type: "evaluative" as const,
    variant: "matrix" as const,
    id: "ex4",
    title: "T",
    domain: "tech",
    scenario: "s",
    axisX: { label: "X", lowLabel: "L", highLabel: "H" },
    axisY: { label: "Y", lowLabel: "L", highLabel: "H" },
    options: [{ id: "o1", title: "O", description: "d", intendedQuadrant: "top-right" as const, explanation: "e" }],
    placements: {},
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

function generativeExercise(rubricScore?: number | null) {
  return {
    type: "generative" as const,
    id: "ex5",
    title: "T",
    domain: "tech",
    scenario: "s",
    stageAtStart: "edit" as const,
    prompts: [{ id: "p1", question: "Q?" }],
    answers: {},
    draftBaseline: {},
    debateOpening: null,
    debateTurns: [],
    rubricScore: rubricScore ?? null,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

function comboExercise() {
  return {
    type: "combo" as const,
    id: "ex6",
    title: "T",
    domain: "tech",
    preset: "full_analysis" as const,
    sharedScenario: "s",
    subExercises: [analyticalExercise(), sequentialExercise()],
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAppSettings.mockResolvedValue({ adaptiveDifficultyEnabled: true });
  vi.mocked(scoreEmbeddedIssueCatch).mockReturnValue(80);
  vi.mocked(computeSequentialAccuracy).mockReturnValue(90);
  vi.mocked(computeSystemsAccuracy).mockReturnValue(90);
  vi.mocked(computeEvaluativeAccuracy).mockReturnValue(90);
});

describe("recordWeaknessesAfterExercise", () => {
  it("does nothing when adaptive difficulty is disabled", async () => {
    mockGetAppSettings.mockResolvedValue({ adaptiveDifficultyEnabled: false });
    await recordWeaknessesAfterExercise(analyticalExercise(), confidence);
    expect(mockRecordHit).not.toHaveBeenCalled();
    expect(mockUpsertMiss).not.toHaveBeenCalled();
  });

  it("records hit for analytical when all issues caught above threshold", async () => {
    vi.mocked(scoreEmbeddedIssueCatch).mockReturnValue(80);
    await recordWeaknessesAfterExercise(analyticalExercise(), confidence);
    expect(mockRecordHit).toHaveBeenCalledWith("analytical", "bias");
  });

  it("records miss for analytical when issue not caught", async () => {
    vi.mocked(scoreEmbeddedIssueCatch).mockReturnValue(30);
    await recordWeaknessesAfterExercise(analyticalExercise({ catchScore: 30 }), confidence);
    expect(mockUpsertMiss).toHaveBeenCalledWith("analytical", "bias");
  });

  it("records hit for sequential when accuracy >= 85", async () => {
    vi.mocked(computeSequentialAccuracy).mockReturnValue(90);
    await recordWeaknessesAfterExercise(sequentialExercise(), confidence);
    expect(mockRecordHit).toHaveBeenCalledWith("sequential", "sequential_dependency_order");
  });

  it("records miss for sequential when accuracy < 72", async () => {
    vi.mocked(computeSequentialAccuracy).mockReturnValue(60);
    await recordWeaknessesAfterExercise(sequentialExercise(), confidence);
    expect(mockUpsertMiss).toHaveBeenCalledWith("sequential", "sequential_dependency_order");
  });

  it("records nothing for sequential in dead zone (72-85)", async () => {
    vi.mocked(computeSequentialAccuracy).mockReturnValue(78);
    await recordWeaknessesAfterExercise(sequentialExercise(), confidence);
    expect(mockRecordHit).not.toHaveBeenCalled();
    expect(mockUpsertMiss).not.toHaveBeenCalled();
  });

  it("records hit for systems when accuracy >= 85", async () => {
    vi.mocked(computeSystemsAccuracy).mockReturnValue(88);
    await recordWeaknessesAfterExercise(systemsExercise(), confidence);
    expect(mockRecordHit).toHaveBeenCalledWith("systems", "systems_edges_shock");
  });

  it("records miss for systems when accuracy < 70", async () => {
    vi.mocked(computeSystemsAccuracy).mockReturnValue(50);
    await recordWeaknessesAfterExercise(systemsExercise(), confidence);
    expect(mockUpsertMiss).toHaveBeenCalledWith("systems", "systems_edges_shock");
  });

  it("records hit for evaluative matrix when accuracy >= 82", async () => {
    vi.mocked(computeEvaluativeAccuracy).mockReturnValue(85);
    await recordWeaknessesAfterExercise(evaluativeExercise(), confidence);
    expect(mockRecordHit).toHaveBeenCalledWith("evaluative", "evaluative_matrix_placement");
  });

  it("records miss for evaluative when accuracy < 65", async () => {
    vi.mocked(computeEvaluativeAccuracy).mockReturnValue(50);
    await recordWeaknessesAfterExercise(evaluativeExercise(), confidence);
    expect(mockUpsertMiss).toHaveBeenCalledWith("evaluative", "evaluative_matrix_placement");
  });

  it("records hit for generative when rubricScore >= 78", async () => {
    await recordWeaknessesAfterExercise(generativeExercise(80), confidence);
    expect(mockRecordHit).toHaveBeenCalledWith("generative", "generative_rubric_depth");
  });

  it("records miss for generative when rubricScore < 62", async () => {
    await recordWeaknessesAfterExercise(generativeExercise(50), confidence);
    expect(mockUpsertMiss).toHaveBeenCalledWith("generative", "generative_rubric_depth");
  });

  it("falls back to confidence.actualAccuracy for generative when rubricScore is null", async () => {
    const conf: ConfidenceRecord = { ...confidence, actualAccuracy: 80 };
    await recordWeaknessesAfterExercise(generativeExercise(null), conf);
    expect(mockRecordHit).toHaveBeenCalledWith("generative", "generative_rubric_depth");
  });

  it("does nothing for generative when no score available", async () => {
    const conf: ConfidenceRecord = { ...confidence, actualAccuracy: undefined as unknown as number };
    await recordWeaknessesAfterExercise(generativeExercise(null), conf);
    expect(mockRecordHit).not.toHaveBeenCalled();
    expect(mockUpsertMiss).not.toHaveBeenCalled();
  });

  it("processes each sub-exercise in combo", async () => {
    vi.mocked(scoreEmbeddedIssueCatch).mockReturnValue(80);
    vi.mocked(computeSequentialAccuracy).mockReturnValue(90);
    await recordWeaknessesAfterExercise(comboExercise(), confidence);
    expect(mockRecordHit).toHaveBeenCalledWith("analytical", "bias");
    expect(mockRecordHit).toHaveBeenCalledWith("sequential", "sequential_dependency_order");
  });
});
