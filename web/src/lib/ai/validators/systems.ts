import { z } from "zod";

const connectionTypeSchema = z.enum([
  "depends_on",
  "conflicts_with",
  "enables",
  "risks",
]);

const nodeIdSchema = z.enum([
  "node_1",
  "node_2",
  "node_3",
  "node_4",
  "node_5",
  "node_6",
]);

const nodeSchema = z.object({
  id: nodeIdSchema,
  label: z.string().max(20),
  description: z.string().max(50),
  x: z.number().min(10).max(90),
  y: z.number().min(10).max(90),
});

const intendedConnectionSchema = z.object({
  from: nodeIdSchema,
  to: nodeIdSchema,
  type: connectionTypeSchema,
  explanation: z.string(),
});

const shockEventSchema = z.object({
  description: z.string(),
  directlyAffected: z.array(nodeIdSchema),
  indirectlyAffected: z.array(nodeIdSchema),
  explanation: z.string(),
});

export const systemsExerciseSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  nodes: z.array(nodeSchema).length(6),
  intendedConnections: z.array(intendedConnectionSchema).min(1),
  shockEvent: shockEventSchema,
});

export type SystemsExercisePayload = z.infer<typeof systemsExerciseSchema>;
export type SystemsConnectionType = z.infer<typeof connectionTypeSchema>;

const SYSTEMS_NODE_LABEL_MAX = 20;
const SYSTEMS_NODE_DESCRIPTION_MAX = 50;

/** Clamp oversized model strings so Zod matches ai_plan node limits (labels ≤20, descriptions ≤50). */
export function sanitizeSystemsNodesInPlace(parsed: unknown): void {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("nodes" in parsed) ||
    !Array.isArray((parsed as { nodes?: unknown }).nodes)
  ) {
    return;
  }
  const nodes = (parsed as { nodes: Record<string, unknown>[] }).nodes;
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    if (typeof n.label === "string" && n.label.length > SYSTEMS_NODE_LABEL_MAX) {
      n.label = n.label.slice(0, SYSTEMS_NODE_LABEL_MAX);
    }
    if (
      typeof n.description === "string" &&
      n.description.length > SYSTEMS_NODE_DESCRIPTION_MAX
    ) {
      n.description = n.description.slice(0, SYSTEMS_NODE_DESCRIPTION_MAX);
    }
  }
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

export type ParseSystemsResult =
  | { success: true; data: SystemsExercisePayload }
  | { success: false; error: string };

export function parseSystemsExerciseJson(text: string): ParseSystemsResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  sanitizeSystemsNodesInPlace(parsed);
  const result = systemsExerciseSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { success: true, data: result.data };
}

const NODE_IDS = [
  "node_1",
  "node_2",
  "node_3",
  "node_4",
  "node_5",
  "node_6",
] as const;

/** Phase 3.4 semantic checks after Zod (ids, duplicates, min distance, shock refs). */
export function validateSystemsExerciseSemantics(
  data: SystemsExercisePayload,
): string[] {
  const errors: string[] = [];
  const ids = new Set(data.nodes.map((n) => n.id));

  if (ids.size !== 6) {
    errors.push("Expected 6 unique node ids");
  }
  for (const expected of NODE_IDS) {
    if (!ids.has(expected)) {
      errors.push(`Missing required node id ${expected}`);
    }
  }

  for (let i = 0; i < data.nodes.length; i++) {
    for (let j = i + 1; j < data.nodes.length; j++) {
      const a = data.nodes[i]!;
      const b = data.nodes[j]!;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 15) {
        errors.push(
          `Nodes ${a.id} and ${b.id} are too close (${d.toFixed(1)}% < 15% minimum)`,
        );
      }
    }
  }

  const seenPairs = new Set<string>();
  for (const c of data.intendedConnections) {
    if (!ids.has(c.from)) {
      errors.push(`intendedConnections references unknown from: ${c.from}`);
    }
    if (!ids.has(c.to)) {
      errors.push(`intendedConnections references unknown to: ${c.to}`);
    }
    const key = `${c.from}->${c.to}`;
    if (seenPairs.has(key)) {
      errors.push(`Duplicate intended connection ${key}`);
    }
    seenPairs.add(key);
  }

  for (const id of data.shockEvent.directlyAffected) {
    if (!ids.has(id)) {
      errors.push(`shockEvent.directlyAffected references unknown node: ${id}`);
    }
  }
  for (const id of data.shockEvent.indirectlyAffected) {
    if (!ids.has(id)) {
      errors.push(`shockEvent.indirectlyAffected references unknown node: ${id}`);
    }
  }

  return errors;
}

export const SYSTEMS_RETRY_SUFFIX = `
IMPORTANT: Your previous JSON failed validation. Fix ALL issues:
- node ids must be exactly node_1 … node_6
- intendedConnections from/to must use only those ids
- no duplicate (from,to) pairs
- any two nodes must be at least 15 apart in (x,y) percent space (Euclidean distance)
- shockEvent.directlyAffected and indirectlyAffected must only reference existing node ids
Return ONLY corrected valid JSON with the same shape as before.`;
