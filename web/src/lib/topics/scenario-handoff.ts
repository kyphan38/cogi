/**
 * "Specific scenario" (PLAN-topic-ideas.md T2): one text box on the New exercise page.
 * The text is handed to the exercise page through sessionStorage, under the key the
 * Analytical, Systems and Evaluative flows already read.
 */
export const SCENARIO_HANDOFF_KEY = "cogi:home-source-text";

/** Analytical reads a text of this many words or more as the passage itself. */
export const OWN_TEXT_MIN_WORDS = 120;

/** Modes that can work from the learner's own scenario. */
export const SCENARIO_MODES = ["analytical", "systems", "evaluative", "judgment", "reframe"] as const;
export type ScenarioMode = (typeof SCENARIO_MODES)[number];

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * How a mode uses the text: Analytical analyses a long text as written ("real_data")
 * and builds a passage around a short one; every other mode builds around it.
 */
export function scenarioSource(mode: ScenarioMode, text: string): "real_data" | "custom_scenario" {
  return mode === "analytical" && wordCount(text) >= OWN_TEXT_MIN_WORDS ? "real_data" : "custom_scenario";
}

export interface ScenarioHandoff {
  source: "real_data" | "custom_scenario";
  customScenarioText?: string;
  realDataText?: string;
}

export function handoffFor(mode: ScenarioMode, text: string): ScenarioHandoff {
  const source = scenarioSource(mode, text);
  return source === "real_data" ? { source, realDataText: text.trim() } : { source, customScenarioText: text.trim() };
}

export function saveScenarioHandoff(h: ScenarioHandoff): void {
  try {
    sessionStorage.setItem(SCENARIO_HANDOFF_KEY, JSON.stringify(h));
  } catch {
    // Storage blocked: the exercise opens without the text.
  }
}

/** Read and clear the handed-over scenario (null when there is none). */
export function takeScenarioHandoff(): ScenarioHandoff | null {
  try {
    const raw = sessionStorage.getItem(SCENARIO_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SCENARIO_HANDOFF_KEY);
    const data = JSON.parse(raw) as ScenarioHandoff;
    return data.source === "real_data" || data.source === "custom_scenario" ? data : null;
  } catch {
    return null;
  }
}

/** Read and clear the handed-over scenario text (for flows with a "My situation" box). */
export function takeScenarioText(): string | null {
  const data = takeScenarioHandoff();
  return (data?.customScenarioText ?? data?.realDataText ?? "").trim() || null;
}
