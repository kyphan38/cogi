import type {
  SystemsIntendedConnection,
  SystemsNodeImpact,
  SystemsNodeSpec,
  SystemsShockEvent,
  SystemsUserEdge,
} from "@/lib/types/exercise";

export function buildSystemsShockPerspectivePrompt(input: {
  title: string;
  domain: string;
  scenario: string;
  nodes: SystemsNodeSpec[];
  intendedConnections: SystemsIntendedConnection[];
  shockEvent: SystemsShockEvent;
  userEdges: SystemsUserEdge[];
  nodeImpact: Record<string, SystemsNodeImpact>;
  confidenceBefore: number;
  userContext?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  return `You are a thoughtful peer helping someone practice systems thinking in the domain: ${input.domain}.
User context (may be empty): ${ctx}

Exercise title: ${input.title}
Scenario:
---
${input.scenario}
---

Nodes:
${JSON.stringify(input.nodes, null, 2)}

Intended connections (model reference, not a score):
${JSON.stringify(input.intendedConnections, null, 2)}

Shock scenario:
${JSON.stringify(input.shockEvent, null, 2)}

User-drawn connections:
${JSON.stringify(input.userEdges, null, 2)}

User-marked node impact (none / direct / indirect per node id):
${JSON.stringify(input.nodeImpact, null, 2)}

User self-reported confidence before this reflection: ${input.confidenceBefore}%

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "embedded": [ { "id": string, "title"?: string, "body": string }, ... ],
  "userFound": [ { "id": string, "title"?: string, "body": string }, ... ],
  "additional": [ { "id": string, "title"?: string, "body": string }, ... ],
  "openQuestions": [ { "id": string, "title"?: string, "body": string }, ... ]
}

Map content into keys:
- embedded: ripple read / how shock propagates (3–5 points). Titles optional.
- userFound: compare user's nodeImpact map vs shockEvent.directly/indirectly lists; agree/disagree gently (2–6 points).
- additional: how userEdges relate to ripple dynamics; use intendedConnections as illustration only (2–5 points).
- openQuestions: what to test next in the real system (1–3 points).

Tone: collaborative peer, not a judge. Do not give a numeric score for the exercise. Keep bodies concise.`;
}
