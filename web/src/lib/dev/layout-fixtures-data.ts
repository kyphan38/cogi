import type { AnalyticalExerciseRow, Exercise } from "@/lib/types/exercise";

export const LAYOUT_FIXTURE_PASSAGE =
  "Regional powers are rebalancing alliances while economic interdependence constrains military options. " +
  "Analysts frame the dispute as a binary choice between containment and engagement, omitting middle powers " +
  "that shape trade corridors and energy routes. The narrative assumes causation from a single summit " +
  "without evidence of follow-through by domestic legislatures.";

export const MOCK_GEO_COMPLETED: Exercise[] = [
  {
    id: "e2e-layout-geo-1",
    type: "analytical",
    domain: "Realist lens - power, security, self-interest",
    title: "Layout fixture exercise",
    passage: LAYOUT_FIXTURE_PASSAGE,
    embeddedIssues: [],
    validPoints: [],
    userHighlights: [],
    confidenceBefore: 80,
    aiPerspective: null,
    isGeopolitics: true,
    createdAt: "2026-01-15T12:00:00.000Z",
    completedAt: "2026-01-15T13:00:00.000Z",
  } satisfies AnalyticalExerciseRow,
];

export function makeMockAnalyticalAiPayload(domain: string) {
  const isGeopolitics = /china|NATO|geopolit|ASEAN|strategic competition/i.test(
    domain,
  );
  return {
    title: "Structural reasoning passage",
    passage: LAYOUT_FIXTURE_PASSAGE,
    isSoundReasoning: false,
    hiddenPerspective: "Middle powers matter as much as great-power blocs.",
    missingActors: ["ASEAN secretariat", "Domestic legislatures"],
    embeddedIssues: [
      {
        description: "Framing bias",
        type: "framing_bias" as const,
        severity: "moderate" as const,
        textSegment: "binary choice",
        explanation: "False dichotomy.",
      },
    ],
    validPoints: [],
    isGeopolitics,
  };
}
