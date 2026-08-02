import type { Scenario, LoopState } from "@/lib/types/math-scenario";

export interface MathSessionMessage {
  sender: string;
  message: string;
}

/** In-progress Math scenario run, persisted so it survives a closed tab or a return visit days later. */
export interface ActiveMathSession {
  /** = scenario id. */
  id: string;
  topic: string;
  title: string;
  isAiDraft: boolean;
  /** Full scenario JSON snapshot. Only needed when isAiDraft - catalog scenarios re-resolve by id. */
  scenarioSnapshot?: Scenario;
  loopState: LoopState;
  committedData: {
    committedValue: string | number;
    predictionText?: string;
    confidence: number;
    correct: boolean;
  } | null;
  struggleMessages: MathSessionMessage[];
  teachBackMessages: MathSessionMessage[];
  createdAt: string;
  updatedAt: string;
}
