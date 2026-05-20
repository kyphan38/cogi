import { CUSTOM_DOMAIN_PLACEHOLDER, formatUserScenarioBlock } from "@/lib/ai/prompts/scenario-steering";

export function buildSystemsGenerationPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint =
    input.domain.trim() && input.domain.trim() !== CUSTOM_DOMAIN_PLACEHOLDER
      ? `\nTone/register hint: ${input.domain.trim()}`
      : "";
  const topicIntro = scenarioBlock
    ? `${scenarioBlock}\n\nDesign a systems-thinking exercise whose scenario and node labels reflect THIS situation (teams, tools, stakeholders may be renamed for clarity but keep the same tensions).`
    : `Generate a systems-thinking exercise about **${input.domain}**.`;

  return `You are generating a thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}${domainHint}

${topicIntro}

Requirements:
- Exactly **6 nodes** (not more). Node IDs MUST be exactly: "node_1", "node_2", "node_3", "node_4", "node_5", "node_6"
- Each node: label max 20 characters, description max 50 characters
- x and y are **percentage positions** from 10 to 90 (avoid edges). Nodes must be spread so every pair is at least **15 units** apart in (x,y) Euclidean distance on the percentage plane (prevents overlap).
- intendedConnections: clear dependency-style relationships; include at least **one circular dependency or feedback loop** among these 6 nodes
- Each connection: type is one of "depends_on", "conflicts_with", "enables", "risks", plus explanation string
- shockEvent: a plausible "what-if" ripple scenario with directlyAffected and indirectlyAffected node id arrays (subset of the 6 ids), plus explanation of the chain

Return a single JSON object with this exact shape:
{
  "title": string,
  "scenario": string,
  "nodes": [
    { "id": "node_1", "label": string, "description": string, "x": number, "y": number }
  ],
  "intendedConnections": [
    { "from": "node_1", "to": "node_2", "type": "depends_on", "explanation": string }
  ],
  "shockEvent": {
    "description": string,
    "directlyAffected": ["node_3"],
    "indirectlyAffected": ["node_1"],
    "explanation": string
  }
}

nodes array must have exactly 6 entries with ids node_1 through node_6.${adapt ? `\n\n${adapt}` : ""}`;
}

export function buildGeopoliticsSystemsPrompt(input: {
  domain: string;
  userContext?: string;
  adaptationAppendix?: string;
  customScenario?: string;
}): string {
  const ctx = input.userContext?.trim() || "(none provided)";
  const adapt = input.adaptationAppendix?.trim();
  const scenarioBlock = formatUserScenarioBlock(input.customScenario);
  const domainHint =
    input.domain.trim() && input.domain.trim() !== CUSTOM_DOMAIN_PLACEHOLDER
      ? `\nTone/register hint: ${input.domain.trim()}`
      : "";
  const topicIntro = scenarioBlock
    ? `${scenarioBlock}\n\nDesign a geopolitical systems exercise grounded in this scenario about: ${input.domain}.`
    : `Generate a geopolitical systems exercise about: ${input.domain}.`;

  return `You are generating a geopolitical systems-thinking exercise. Return ONLY valid JSON (no markdown, no prose).

USER context: ${ctx}${domainHint}

${topicIntro}

Requirements:
- Exactly 6 nodes representing key actors, institutions, or forces (ids MUST be "node_1" through "node_6")
- Each node: label max 20 characters, description max 50 characters
- x,y percentage positions (10-90), minimum 15 apart in Euclidean distance - layout nodes for **Perspective A's** structural centrality (hubs/outliers for Actor A). Perspective B uses the SAME node positions; only edges and shock ripples differ.
- perspectiveAName and perspectiveBName: explicit state or major non-state actors (must differ)
- intendedConnections: how Actor A (perspectiveAName) sees relationships - include at least one feedback loop
- intendedConnectionsB: how Actor B (perspectiveBName) sees the SAME nodes differently - include at least one feedback loop
- Each connection: type is "depends_on" | "conflicts_with" | "enables" | "risks", plus explanation
- shockEvent: shared what-if description plus directlyAffected, indirectlyAffected, explanation from Actor A's view
- shockEventB: same shock (do NOT repeat description) - only directlyAffected, indirectlyAffected, explanation from Actor B's view

Return a single JSON object with this exact shape:
{
  "title": string,
  "scenario": string,
  "nodes": [ { "id": "node_1", "label": string, "description": string, "x": number, "y": number } ],
  "perspectiveAName": string,
  "perspectiveBName": string,
  "intendedConnections": [ { "from": "node_1", "to": "node_2", "type": "depends_on", "explanation": string } ],
  "intendedConnectionsB": [ { "from": "node_1", "to": "node_2", "type": "depends_on", "explanation": string } ],
  "shockEvent": {
    "description": string,
    "directlyAffected": ["node_3"],
    "indirectlyAffected": ["node_1"],
    "explanation": string
  },
  "shockEventB": {
    "directlyAffected": ["node_3"],
    "indirectlyAffected": ["node_1"],
    "explanation": string
  }
}

nodes array must have exactly 6 entries with ids node_1 through node_6.${adapt ? `\n\n${adapt}` : ""}`;
}
