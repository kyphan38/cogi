import type { Scenario, Topic } from "@/lib/types/math-scenario";
import { expectedValueScenarios } from "./expected-value";

export const allScenarios: Scenario[] = [...expectedValueScenarios];

export function getScenarioById(id: string): Scenario | undefined {
  return allScenarios.find((s) => s.id === id);
}

export function listScenariosByTopic(topic?: Topic): Scenario[] {
  if (!topic) return allScenarios;
  return allScenarios.filter((s) => s.topic === topic);
}
