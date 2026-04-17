export interface ActionBridge {
  id: string;
  exerciseId: string;
  oneAction: string;
  weeklyFollowThrough: { weekKey: string; done: boolean }[];
  createdAt: string;
}
