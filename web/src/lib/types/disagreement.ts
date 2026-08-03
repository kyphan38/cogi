export type PerspectiveKind =
  | "analytical"
  | "sequential"
  | "systems"
  | "evaluative-matrix"
  | "evaluative-scoring"
  | "evaluative-uncertainty"
  | "generative";

export type PerspectiveSectionKey =
  | "embedded"
  | "userFound"
  | "additional"
  | "openQuestions"
  | "highlightCritiques"
  | "nodeCritiques"
  | "placementCritiques"
  | "critiqueMatrix"
  | "stepCritiques"
  | "openQuestionsList"
  | "outcomeCritiques";

export interface PerspectiveDisagreementRow {
  id: string;
  exerciseId: string;
  kind: PerspectiveKind;
  section: PerspectiveSectionKey;
  pointId: string;
  pointTitle: string | null;
  pointBody: string;
  userReason: string;
  aiReply: string;
  createdAt: string;
}
