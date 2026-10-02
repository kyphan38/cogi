export const LAYOUT_FIXTURE_PASSAGE =
  "Regional powers are rebalancing alliances while economic interdependence constrains military options. " +
  "Analysts frame the dispute as a binary choice between containment and engagement, omitting middle powers " +
  "that shape trade corridors and energy routes. The narrative assumes causation from a single summit " +
  "without evidence of follow-through by domestic legislatures.";

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
