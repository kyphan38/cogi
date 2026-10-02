import type { PracticeLevel } from "@/lib/exercise/levels";
import type { SystemsTaskType } from "@/lib/ai/validators/systems";

/** What each level changes for systems exercises (plan phase 6b). */
export interface SystemsLevelConfig {
  description: string;
  /** Task types offered at setup. */
  taskTypes: SystemsTaskType[];
  /** Pick the 6 components from a list (true) or type them (false). */
  componentCandidates: boolean;
  /** Tell the user how many links the model drew. */
  linkCountHint: boolean;
  /** Meanings of the four link types: always shown, behind a toggle, or hidden. */
  linkTypeGuide: "shown" | "toggle" | "hidden";
  /** Under the shock, tell how many nodes the model marks direct and indirect. */
  impactCountHint: boolean;
}

export const SYSTEMS_LEVELS: Record<PracticeLevel, SystemsLevelConfig> = {
  guided: {
    description: "Pick components from a list. See how many links to find and what each link type means.",
    taskTypes: ["auto"],
    componentCandidates: true,
    linkCountHint: true,
    linkTypeGuide: "shown",
    impactCountHint: true,
  },
  standard: {
    description: "Pick components from a list, then map the links and the shock with fewer hints.",
    taskTypes: ["auto"],
    componentCandidates: true,
    linkCountHint: false,
    linkTypeGuide: "toggle",
    impactCountHint: false,
  },
  expert: {
    description: "Name the components yourself, no hints. Resilience and geopolitics tasks open up.",
    taskTypes: ["auto", "resilience", "geopolitics"],
    componentCandidates: false,
    linkCountHint: false,
    linkTypeGuide: "hidden",
    impactCountHint: false,
  },
};
