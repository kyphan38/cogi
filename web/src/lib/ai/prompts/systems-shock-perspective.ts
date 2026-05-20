import { buildPerspectiveClarityPreamble } from "@/lib/ai/prompts/perspective-clarity-directives";
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
  userProposedComponents?: string[] | null;
  confidenceBefore: number;
  userContext?: string;
  perspectiveAName?: string;
  perspectiveBName?: string;
  intendedConnectionsB?: SystemsIntendedConnection[];
  shockEventB?: {
    directlyAffected: string[];
    indirectlyAffected: string[];
    explanation: string;
  };
  userPerspectiveBNotes?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  const geoBlock =
    input.perspectiveAName &&
    input.perspectiveBName &&
    input.intendedConnectionsB &&
    input.shockEventB
      ? `

Geopolitics dual-perspective context (diagnostic - do not score Perspective B separately):
- Perspective A (${input.perspectiveAName}): user mapped connections and shock impact against this actor's intended structure (intendedConnections + shockEvent above).
- Perspective B (${input.perspectiveBName}): alternate structural view (reference only for comparison):
${JSON.stringify(input.intendedConnectionsB, null, 2)}
- Shock from Perspective B's lens (same shock description as above; affected nodes may differ):
${JSON.stringify(input.shockEventB, null, 2)}
- User notes on how B's view differs structurally:
${(input.userPerspectiveBNotes?.trim() || "(none)").slice(0, 4000)}

In your reflection, weave in both perspectives where relevant: acknowledge blind spots from mapping only A, comment on structural differences the user noted, and how shock ripples might read differently for ${input.perspectiveBName}. Quote user notes where relevant. Do not assign a second numeric accuracy score.`
      : "";

  const clarity = buildPerspectiveClarityPreamble();

  return `You are a thoughtful peer helping someone practice systems thinking in the domain: ${input.domain}.
User context (may be empty): ${ctx}

${clarity}

Exercise title: ${input.title}
Scenario:
---
${input.scenario}
---

User's initial decomposition (before seeing nodes):
${JSON.stringify(input.userProposedComponents ?? [])}

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
  "perspectiveFormat": "clarity_v2",
  "title": string (echo: "${input.title.replace(/"/g, '\\"')}"),
  "suitableFor": "Suitable for <concrete audience>",
  "nodeCritiques": [
    {
      "nodeId": "node_1",
      "nodeLabel": "human label from nodes list",
      "userImpact": "none" | "direct" | "indirect",
      "userContextSnippet": "You marked this node as direct because ... (include edge rationale if relevant)",
      "critique": "You marked 'Label' as direct... However, ...",
      "remediationAlternative": "A systems thinker would also consider..."
    }
  ],
  "openQuestions": ["optional 1-3 strings"]
}

Rules:
- One nodeCritiques row per node in the nodes list (all 6).
- userContextSnippet must state the user's impact choice and any connection pattern affecting that node.
- Compare userImpact to shockEvent.directlyAffected / indirectlyAffected; agree or disagree gently in critique.
- Tone: collaborative peer, not a judge. Do not give a numeric score.${geoBlock}`;
}
