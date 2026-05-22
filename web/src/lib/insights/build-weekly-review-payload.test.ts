import { describe, expect, it } from "vitest";
import {
  MAX_EX_SUMMARY_CHARS,
  MAX_JOURNAL_PROMPT_CHARS,
  MAX_JOURNAL_BLOB_TOTAL,
  MAX_DECISION_TEXT_CHARS,
  MAX_ACTION_CHARS,
  exerciseSummaryForReview,
  aiSnippetForReview,
  journalBlobForReview,
  buildWeeklyReviewSlices,
} from "./build-weekly-review-payload";
import type { Exercise } from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";

function makeExercise(overrides: Partial<Exercise> & { type: Exercise["type"] }): Exercise {
  const base = {
    id: "ex1",
    domain: "test",
    title: "Test Exercise",
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: "2025-01-01",
    completedAt: "2025-01-02",
  };
  if (overrides.type === "analytical") {
    return {
      ...base,
      type: "analytical",
      passage: "Analytical passage text",
      embeddedIssues: [],
      validPoints: [],
      userHighlights: [],
      ...overrides,
    } as Exercise;
  }
  if (overrides.type === "sequential") {
    return {
      ...base,
      type: "sequential",
      scenario: "Sequential scenario text",
      steps: [],
      criticalErrors: [],
      userOrderedStepIds: [],
      ...overrides,
    } as Exercise;
  }
  if (overrides.type === "systems") {
    return {
      ...base,
      type: "systems",
      scenario: "Systems scenario text",
      nodes: [],
      intendedConnections: [],
      shockEvent: { directlyAffected: [], indirectlyAffected: [], explanation: "" },
      userEdges: [],
      nodeImpact: {},
      ...overrides,
    } as Exercise;
  }
  if (overrides.type === "generative") {
    return {
      ...base,
      type: "generative",
      scenario: "Generative scenario text",
      stageAtStart: "edit",
      prompts: [],
      answers: {},
      draftBaseline: {},
      debateOpening: null,
      debateTurns: [],
      rubricScore: null,
      ...overrides,
    } as Exercise;
  }
  if (overrides.type === "combo") {
    return {
      ...base,
      type: "combo",
      preset: "full_analysis",
      scenario: "Combo scenario text",
      subExercises: [],
      ...overrides,
    } as Exercise;
  }
  return {
    ...base,
    type: "evaluative",
    variant: "matrix",
    scenario: "Evaluative scenario text",
    axisX: { label: "X", lowLabel: "Low", highLabel: "High" },
    axisY: { label: "Y", lowLabel: "Low", highLabel: "High" },
    options: [],
    placements: {},
    ...overrides,
  } as Exercise;
}

describe("clip (tested via exerciseSummaryForReview)", () => {
  it("returns short text unchanged", () => {
    const ex = makeExercise({ type: "analytical", passage: "Short text" } as never);
    expect(exerciseSummaryForReview(ex)).toBe("Short text");
  });

  it("truncates long text with ellipsis", () => {
    const long = "a".repeat(500);
    const ex = makeExercise({ type: "analytical", passage: long } as never);
    const result = exerciseSummaryForReview(ex);
    expect(result.length).toBe(MAX_EX_SUMMARY_CHARS);
    expect(result.endsWith("…")).toBe(true);
  });

  it("trims whitespace", () => {
    const ex = makeExercise({ type: "analytical", passage: "  padded  " } as never);
    expect(exerciseSummaryForReview(ex)).toBe("padded");
  });
});

describe("exerciseSummaryForReview", () => {
  it("uses passage for analytical", () => {
    const ex = makeExercise({ type: "analytical", passage: "The passage" } as never);
    expect(exerciseSummaryForReview(ex)).toBe("The passage");
  });

  it("uses scenario for sequential", () => {
    const ex = makeExercise({ type: "sequential", scenario: "The scenario" } as never);
    expect(exerciseSummaryForReview(ex)).toBe("The scenario");
  });

  it("uses scenario for systems", () => {
    const ex = makeExercise({ type: "systems", scenario: "Systems scenario" } as never);
    expect(exerciseSummaryForReview(ex)).toBe("Systems scenario");
  });

  it("uses scenario for generative", () => {
    const ex = makeExercise({ type: "generative", scenario: "Gen scenario" } as never);
    expect(exerciseSummaryForReview(ex)).toBe("Gen scenario");
  });

  it("uses scenario for combo", () => {
    const ex = makeExercise({ type: "combo", scenario: "Combo scenario" } as never);
    expect(exerciseSummaryForReview(ex)).toBe("Combo scenario");
  });

  it("uses scenario for evaluative", () => {
    const ex = makeExercise({ type: "evaluative", scenario: "Eval scenario" } as never);
    expect(exerciseSummaryForReview(ex)).toBe("Eval scenario");
  });
});

describe("aiSnippetForReview", () => {
  it("returns empty string when no perspective", () => {
    const ex = makeExercise({ type: "analytical", aiPerspective: null } as never);
    expect(aiSnippetForReview(ex)).toBe("");
  });

  it("returns clipped perspective", () => {
    const ex = makeExercise({ type: "analytical", aiPerspective: "Some AI feedback" } as never);
    expect(aiSnippetForReview(ex)).toBe("Some AI feedback");
  });

  it("truncates long perspective", () => {
    const long = "w ".repeat(300);
    const ex = makeExercise({ type: "analytical", aiPerspective: long } as never);
    const result = aiSnippetForReview(ex);
    expect(result.length).toBe(MAX_EX_SUMMARY_CHARS);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("journalBlobForReview", () => {
  it("returns empty for undefined journal", () => {
    expect(journalBlobForReview(undefined)).toBe("");
  });

  it("joins prompt responses with separator", () => {
    const j: JournalEntry = {
      id: "j1",
      exerciseId: "ex1",
      promptIds: ["p1", "p2"],
      aiReferenceLine: null,
      responses: { p1: "First response", p2: "Second response" },
      createdAt: "2025-01-01",
    };
    expect(journalBlobForReview(j)).toBe("First response | Second response");
  });

  it("skips empty prompt responses", () => {
    const j: JournalEntry = {
      id: "j1",
      exerciseId: "ex1",
      promptIds: ["p1", "p2", "p3"],
      aiReferenceLine: null,
      responses: { p1: "Has text", p2: "  ", p3: "Also text" },
      createdAt: "2025-01-01",
    };
    expect(journalBlobForReview(j)).toBe("Has text | Also text");
  });

  it("truncates individual prompts", () => {
    const long = "x".repeat(300);
    const j: JournalEntry = {
      id: "j1",
      exerciseId: "ex1",
      promptIds: ["p1"],
      aiReferenceLine: null,
      responses: { p1: long },
      createdAt: "2025-01-01",
    };
    const result = journalBlobForReview(j);
    expect(result.length).toBeLessThanOrEqual(MAX_JOURNAL_PROMPT_CHARS);
  });

  it("truncates total blob", () => {
    const text = "word ".repeat(100);
    const j: JournalEntry = {
      id: "j1",
      exerciseId: "ex1",
      promptIds: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
      aiReferenceLine: null,
      responses: {
        p1: text, p2: text, p3: text, p4: text,
        p5: text, p6: text, p7: text, p8: text,
      },
      createdAt: "2025-01-01",
    };
    const result = journalBlobForReview(j);
    expect(result.length).toBeLessThanOrEqual(MAX_JOURNAL_BLOB_TOTAL);
  });
});

describe("buildWeeklyReviewSlices", () => {
  it("builds slices from exercises, journals, decisions, actions", () => {
    const exercises = [
      makeExercise({ id: "ex1", type: "analytical", passage: "Passage 1" } as never),
    ];
    const journals = new Map<string, JournalEntry | undefined>([
      ["ex1", {
        id: "j1", exerciseId: "ex1", promptIds: ["p1"],
        aiReferenceLine: null, responses: { p1: "My reflection" },
        emotionLabel: "confident", createdAt: "2025-01-01",
      }],
    ]);
    const decisions = [
      { id: "d1", text: "Decision text", decidedAt: "2025-01-01", domain: "test",
        linkedExerciseId: null, followUpNote: "follow up", remindOutcomeAt: null,
        outcomeReview: null, createdAt: "2025-01-01" },
    ];
    const actions = [
      { id: "a1", exerciseId: "ex1", oneAction: "Do something", exerciseTitle: "Title",
        weeklyFollowThrough: [], createdAt: "2025-01-01" },
    ];

    const result = buildWeeklyReviewSlices(exercises, journals, decisions, actions, {
      perspectiveDisagreementCount: 2,
    });

    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].type).toBe("analytical");
    expect(result.exercises[0].summary).toBe("Passage 1");
    expect(result.exercises[0].journalBlob).toBe("My reflection");
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].followUpNoteFilled).toBe(true);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].oneAction).toBe("Do something");
    expect(result.emotionHistogram).toEqual({ confident: 1 });
    expect(result.perspectiveDisagreementCount).toBe(2);
  });

  it("returns empty slices for no data", () => {
    const result = buildWeeklyReviewSlices([], new Map(), [], []);
    expect(result.exercises).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.emotionHistogram).toEqual({});
    expect(result.perspectiveDisagreementCount).toBe(0);
  });

  it("clips decision text to MAX_DECISION_TEXT_CHARS", () => {
    const long = "d".repeat(600);
    const decisions = [
      { id: "d1", text: long, decidedAt: "2025-01-01", domain: "test",
        linkedExerciseId: null, followUpNote: null, remindOutcomeAt: null,
        outcomeReview: null, createdAt: "2025-01-01" },
    ];
    const result = buildWeeklyReviewSlices([], new Map(), decisions, []);
    expect(result.decisions[0].text.length).toBe(MAX_DECISION_TEXT_CHARS);
  });

  it("clips action text to MAX_ACTION_CHARS", () => {
    const long = "a".repeat(500);
    const actions = [
      { id: "a1", exerciseId: "ex1", oneAction: long, exerciseTitle: "T",
        weeklyFollowThrough: [], createdAt: "2025-01-01" },
    ];
    const result = buildWeeklyReviewSlices([], new Map(), [], actions);
    expect(result.actions[0].oneAction.length).toBe(MAX_ACTION_CHARS);
  });

  it("counts emotion histogram across journals", () => {
    const journals = new Map<string, JournalEntry | undefined>([
      ["ex1", { id: "j1", exerciseId: "ex1", promptIds: [], aiReferenceLine: null,
        responses: {}, emotionLabel: "anxious", createdAt: "" }],
      ["ex2", { id: "j2", exerciseId: "ex2", promptIds: [], aiReferenceLine: null,
        responses: {}, emotionLabel: "anxious", createdAt: "" }],
      ["ex3", { id: "j3", exerciseId: "ex3", promptIds: [], aiReferenceLine: null,
        responses: {}, emotionLabel: "confident", createdAt: "" }],
    ]);
    const result = buildWeeklyReviewSlices([], journals, [], []);
    expect(result.emotionHistogram).toEqual({ anxious: 2, confident: 1 });
  });
});
