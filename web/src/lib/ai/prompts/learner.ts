import type { PracticeLevel } from "@/lib/exercise/levels";

/**
 * Who the AI writes for. Only Guided learners are beginners: calling an Expert
 * learner a beginner made the model simplify too much. Older rows have no level.
 */
export function learnerFor(level: PracticeLevel | undefined): string {
  switch (level) {
    case "guided":
      return "a beginner";
    case "standard":
      return "a learner at the Standard level, past the basics";
    case "expert":
      return "an experienced learner at the Expert level";
    default:
      return "a learner";
  }
}
