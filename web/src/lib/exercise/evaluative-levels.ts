import type { PracticeLevel } from "@/lib/exercise/levels";
import type { EvaluativeTaskType } from "@/lib/ai/validators/evaluative";

/** What each level changes for evaluative exercises (plan phase 6b). */
export interface EvaluativeLevelConfig {
  description: string;
  /** Task types offered at setup. */
  taskTypes: EvaluativeTaskType[];
  /** Always generate a 2x2 matrix (two criteria) on the auto path. */
  matrixOnly: boolean;
  /** Pick criteria from a list (true) or type them (false). */
  criteriaCandidates: boolean;
}

export const EVALUATIVE_LEVELS: Record<PracticeLevel, EvaluativeLevelConfig> = {
  guided: {
    description: "Two criteria on a 2x2 board. Pick criteria from a list.",
    taskTypes: ["auto"],
    matrixOnly: true,
    criteriaCandidates: true,
  },
  standard: {
    description: "A 2x2 board or a weighted table with more criteria. Pick criteria from a list.",
    taskTypes: ["auto"],
    matrixOnly: false,
    criteriaCandidates: true,
  },
  expert: {
    description: "Name criteria yourself. Dealbreaker and uncertainty tasks open up.",
    taskTypes: ["auto", "dealbreaker", "uncertainty"],
    matrixOnly: false,
    criteriaCandidates: false,
  },
};
