import { describe, expect, it } from "vitest";
import { buildGeopoliticsAnalyticalPrompt } from "./analytical";
import { buildEvaluativeGenerationPrompt } from "./evaluative";
import { buildGeopoliticsSystemsPrompt } from "./systems";
import { GEO_ANALYTICAL_LEVELS } from "@/lib/exercise/analytical-levels";

describe("geopolitics prompts (PLAN-geopolitics.md G1)", () => {
  it("guided analytical asks for 2 issues, 1 decoy, and the learning extras", () => {
    const p = buildGeopoliticsAnalyticalPrompt({ domain: "US-China strategic competition", level: GEO_ANALYTICAL_LEVELS.guided });
    expect(p).toContain("embeddedIssues must have exactly 2 items");
    expect(p).toContain("validPoints must have exactly 1 item.");
    expect(p).not.toContain("assumed causation (correlation");
    for (const field of ['"concepts"', '"perspectiveOptions"', '"actorCandidates"', '"lensQuestions"']) expect(p).toContain(field);
    expect(p).toContain("FACT SAFETY");
  });

  it("without a level keeps the full brief and no extras", () => {
    const p = buildGeopoliticsAnalyticalPrompt({ domain: "US-China strategic competition" });
    expect(p).toContain("embeddedIssues must have exactly 4 items");
    expect(p).not.toContain('"lensQuestions"');
  });

  it("systems and the guided evaluative matrix carry the fact rule; the matrix uses stakeholder axes", () => {
    expect(buildGeopoliticsSystemsPrompt({ domain: "Energy geopolitics" })).toContain("FACT SAFETY");
    const m = buildEvaluativeGenerationPrompt({ domain: "Energy geopolitics", matrixOnly: true, stakeholderAxes: true });
    expect(m).toContain("interest of a DIFFERENT stakeholder");
    expect(m).toContain("FACT SAFETY");
    expect(buildEvaluativeGenerationPrompt({ domain: "Cooking", matrixOnly: true })).not.toContain("FACT SAFETY");
  });
});
