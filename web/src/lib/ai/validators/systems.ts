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

const shockEventBSchema = z.object({
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

export const systemsGeopoliticsExerciseSchema = systemsExerciseSchema.extend({
  perspectiveAName: z.string().min(1),
  perspectiveBName: z.string().min(1),
  intendedConnectionsB: z.array(intendedConnectionSchema).min(1),
  shockEventB: shockEventBSchema,
});

export type SystemsExercisePayload = z.infer<typeof systemsExerciseSchema>;
export type GeopoliticsSystemsExercisePayload = z.infer<
  typeof systemsGeopoliticsExerciseSchema
>;
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

function looksLikeGeopoliticsSystemsRaw(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Record<string, unknown>;
  return (
    typeof o.perspectiveAName === "string" ||
    typeof o.perspectiveBName === "string" ||
    Array.isArray(o.intendedConnectionsB)
  );
}

export type ParseSystemsResult =
  | { success: true; data: SystemsExercisePayload | GeopoliticsSystemsExercisePayload }
  | { success: false; error: string };

export function isGeopoliticsSystemsPayload(
  data: SystemsExercisePayload | GeopoliticsSystemsExercisePayload,
): data is GeopoliticsSystemsExercisePayload {
  return (
    "perspectiveAName" in data &&
    typeof (data as GeopoliticsSystemsExercisePayload).perspectiveAName === "string" &&
    (data as GeopoliticsSystemsExercisePayload).perspectiveAName.trim().length > 0
  );
}

export function parseSystemsExerciseJson(text: string): ParseSystemsResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  sanitizeSystemsNodesInPlace(parsed);

  if (looksLikeGeopoliticsSystemsRaw(parsed)) {
    const geo = systemsGeopoliticsExerciseSchema.safeParse(parsed);
    if (geo.success) {
      return { success: true, data: geo.data };
    }
    return {
      success: false,
      error: geo.error.issues.map((i) => i.message).join("; "),
    };
  }

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

type ConnectionLike = {
  from: (typeof NODE_IDS)[number];
  to: (typeof NODE_IDS)[number];
};

function validateConnectionSet(
  connections: ConnectionLike[],
  ids: Set<string>,
  label: string,
): string[] {
  const errors: string[] = [];
  const seenPairs = new Set<string>();
  for (const c of connections) {
    if (!ids.has(c.from)) {
      errors.push(`${label} references unknown from: ${c.from}`);
    }
    if (!ids.has(c.to)) {
      errors.push(`${label} references unknown to: ${c.to}`);
    }
    const key = `${c.from}->${c.to}`;
    if (seenPairs.has(key)) {
      errors.push(`Duplicate ${label} connection ${key}`);
    }
    seenPairs.add(key);
  }
  return errors;
}

function hasDirectedCycle(connections: ConnectionLike[]): boolean {
  const adj = new Map<string, string[]>();
  for (const c of connections) {
    const list = adj.get(c.from) ?? [];
    list.push(c.to);
    adj.set(c.from, list);
    if (!adj.has(c.to)) adj.set(c.to, []);
  }
  const visited = new Set<string>();
  const stack = new Set<string>();

  const dfs = (node: string): boolean => {
    visited.add(node);
    stack.add(node);
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) {
        if (dfs(next)) return true;
      } else if (stack.has(next)) {
        return true;
      }
    }
    stack.delete(node);
    return false;
  };

  for (const node of adj.keys()) {
    if (!visited.has(node) && dfs(node)) return true;
  }
  return false;
}

function validateShockRefs(
  directlyAffected: string[],
  indirectlyAffected: string[],
  ids: Set<string>,
  label: string,
): string[] {
  const errors: string[] = [];
  for (const id of directlyAffected) {
    if (!ids.has(id)) {
      errors.push(`${label}.directlyAffected references unknown node: ${id}`);
    }
  }
  for (const id of indirectlyAffected) {
    if (!ids.has(id)) {
      errors.push(`${label}.indirectlyAffected references unknown node: ${id}`);
    }
  }
  return errors;
}

/** Phase 3.4 semantic checks after Zod (ids, duplicates, min distance, shock refs). */
export function validateSystemsExerciseSemantics(
  data: SystemsExercisePayload | GeopoliticsSystemsExercisePayload,
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

  errors.push(
    ...validateConnectionSet(data.intendedConnections, ids, "intendedConnections"),
  );
  errors.push(
    ...validateShockRefs(
      data.shockEvent.directlyAffected,
      data.shockEvent.indirectlyAffected,
      ids,
      "shockEvent",
    ),
  );

  return errors;
}

export function validateGeopoliticsSystemsSemantics(
  data: GeopoliticsSystemsExercisePayload,
): string[] {
  if (!isGeopoliticsSystemsPayload(data)) return [];

  const errors: string[] = [];
  const ids = new Set(data.nodes.map((n) => n.id));

  if (!data.perspectiveBName?.trim() || !data.perspectiveAName?.trim()) {
    errors.push("perspectiveAName and perspectiveBName are required");
  }
  if (
    data.perspectiveAName.trim().toLowerCase() ===
    data.perspectiveBName.trim().toLowerCase()
  ) {
    errors.push("perspectiveAName and perspectiveBName must differ");
  }
  if (!data.intendedConnectionsB?.length) {
    errors.push("intendedConnectionsB is required");
  }
  if (!data.shockEventB) {
    errors.push("shockEventB is required");
  }

  errors.push(
    ...validateConnectionSet(
      data.intendedConnectionsB,
      ids,
      "intendedConnectionsB",
    ),
  );
  if (data.shockEventB) {
    errors.push(
      ...validateShockRefs(
        data.shockEventB.directlyAffected,
        data.shockEventB.indirectlyAffected,
        ids,
        "shockEventB",
      ),
    );
  }

  if (!hasDirectedCycle(data.intendedConnections)) {
    errors.push("intendedConnections must include at least one feedback loop");
  }
  if (!hasDirectedCycle(data.intendedConnectionsB)) {
    errors.push("intendedConnectionsB must include at least one feedback loop");
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

export const GEOPOLITICS_SYSTEMS_RETRY_SUFFIX = `
IMPORTANT: Your previous geopolitics systems JSON failed validation. Fix ALL issues:
- include perspectiveAName, perspectiveBName, intendedConnectionsB, shockEventB
- perspectives must name different actors
- both connection sets need valid node ids, no duplicate (from,to) pairs, and at least one feedback loop each
- shockEventB only varies directlyAffected, indirectlyAffected, explanation (shared shock description is in shockEvent)
Return ONLY corrected valid JSON with the same shape as before.`;
