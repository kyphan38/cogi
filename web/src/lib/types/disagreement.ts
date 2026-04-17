export type PerspectiveKind =
  | "analytical"
  | "sequential"
  | "systems"
  | "evaluative-matrix"
  | "evaluative-scoring"
  | "generative";

export type PerspectiveSectionKey =
  | "embedded"
  | "userFound"
  | "additional"
  | "openQuestions";

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
