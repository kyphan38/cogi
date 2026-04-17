/** Structured AI perspective (Phase 6.4 + cross-cutting ordering). */
export interface PerspectivePoint {
  id: string;
  title?: string;
  body: string;
}

export interface AIPerspectiveStructured {
  embedded: PerspectivePoint[];
  userFound: PerspectivePoint[];
  additional: PerspectivePoint[];
  openQuestions: PerspectivePoint[];
}
