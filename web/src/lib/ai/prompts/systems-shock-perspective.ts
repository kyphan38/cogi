import type {
  SystemsIntendedConnection,
  SystemsNodeCriticalityHint,
  SystemsNodeImpact,
  SystemsNodeSpec,
  SystemsShockEvent,
  SystemsUserEdge,
} from "@/lib/types/exercise";
import type { SystemsResult } from "@/lib/exercise/systems-score";
import { CONNECTION_TYPE_INFO, IMPACT_LABELS } from "@/lib/exercise/systems-labels";
import { SYSTEMS_IDEA_GUIDE, SYSTEMS_IDEA_NAMES, type SystemsIdea } from "@/lib/exercise/systems-idea-guide";

/**
 * The cases the AI must explain, one block per ref. Verdicts come from code
 * (`scoreSystems`), so the AI never judges right or wrong itself.
 */
export function buildSystemsCoachingCases(input: {
  nodes: SystemsNodeSpec[];
  intendedConnections: SystemsIntendedConnection[];
  userEdges: SystemsUserEdge[];
  result: SystemsResult;
}): string {
  const label = (id: string) => input.nodes.find((n) => n.id === id)?.label ?? id;
  const typeName = (t: SystemsUserEdge["type"]) => CONNECTION_TYPE_INFO[t].label;
  const blocks: string[] = [];
  for (const i of input.result.impacts) {
    const verdict = i.correct
      ? `CORRECT - marked ${IMPACT_LABELS[i.user]}.`
      : `DIFFERENT - marked ${IMPACT_LABELS[i.user]}; the model says ${IMPACT_LABELS[i.expected]}.`;
    blocks.push(`node_${i.nodeId} - node "${label(i.nodeId)}" under the shock\n  User: ${verdict}`);
  }
  for (const c of input.result.connections) {
    const ic = input.intendedConnections[c.index]!;
    const verdict = !c.found
      ? "MISSED - did not draw it."
      : c.direction === "reversed"
        ? `FOUND BUT REVERSED - drew ${label(ic.to)} -> ${label(ic.from)} (${typeName(c.userType!)}).`
        : c.exact
          ? c.userType === ic.type
            ? "CORRECT - same direction and type."
            : `CORRECT - drew it as "${typeName(c.userType!)}" the other way, which means the same.`
          : `FOUND, OTHER TYPE - drew it as "${typeName(c.userType!)}".`;
    blocks.push(
      [
        `conn_${c.index + 1} - model connection ${label(ic.from)} -> ${label(ic.to)} (${typeName(ic.type)})`,
        `  Model's note: ${ic.explanation}`,
        `  User: ${verdict}`,
      ].join("\n"),
    );
  }
  for (const s of input.result.spread ?? []) {
    const options = s.possibleVia.map(label).join(" or ") || "no affected neighbour in the model";
    blocks.push(
      `via_${s.nodeId} - how the shock reaches "${label(s.nodeId)}"\n  User: ${
        s.correct ? `CORRECT - through "${label(s.via)}".` : `DIFFERENT - said through "${label(s.via)}"; the model path is through ${options}.`
      }`,
    );
  }
  input.result.extraEdgeIds.forEach((id, i) => {
    const e = input.userEdges.find((x) => x.id === id);
    if (!e) return;
    blocks.push(
      `extra_${i + 1} - the user's own connection, not in the model\n  User drew: ${label(e.source)} -> ${label(e.target)} (${typeName(e.type)}).`,
    );
  });
  return blocks.join("\n\n");
}

export function buildSystemsShockPerspectivePrompt(input: {
  title: string;
  domain: string;
  scenario: string;
  nodes: SystemsNodeSpec[];
  intendedConnections: SystemsIntendedConnection[];
  shockEvent: SystemsShockEvent;
  userEdges: SystemsUserEdge[];
  nodeImpact: Record<string, SystemsNodeImpact>;
  result: SystemsResult;
  requiredRefs: string[];
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
  variantKind?: "resilience";
  criticalityGroundTruth?: SystemsNodeCriticalityHint[];
  userCriticalityRanking?: Record<string, number>;
  secondShockEvent?: SystemsShockEvent;
  /** Systems ideas that get a "Take with you" card, picked in code (pickSystemsCards). */
  cardIdeas?: SystemsIdea[];
}): string {
  const ctx = input.userContext?.trim() || "(none)";
  const cardLines = (input.cardIdeas ?? [])
    .map((k) => `- ${k} (${SYSTEMS_IDEA_NAMES[k]}): ${SYSTEMS_IDEA_GUIDE[k].spot} How to help others: ${SYSTEMS_IDEA_GUIDE[k].othersTip}`)
    .join("\n");
  const r = input.result;
  const isGeo = Boolean(
    input.perspectiveAName && input.perspectiveBName && input.intendedConnectionsB && input.shockEventB,
  );
  const isResilience = Boolean(
    input.variantKind === "resilience" &&
      input.criticalityGroundTruth &&
      input.userCriticalityRanking &&
      input.secondShockEvent,
  );

  const geoBlock = isGeo
    ? `

SECOND PERSPECTIVE (geopolitics):
- The user mapped the system from ${input.perspectiveAName}'s view. ${input.perspectiveBName} sees it like this:
${JSON.stringify(input.intendedConnectionsB, null, 2)}
- The shock from ${input.perspectiveBName}'s view: ${JSON.stringify(input.shockEventB)}
- The user's notes on how ${input.perspectiveBName} differs: ${(input.userPerspectiveBNotes?.trim() || "(none)").slice(0, 4000)}
Write "metaNote": 2-3 short sentences on the biggest structural difference between the two views and whether the user's notes caught it.`
    : "";

  const resilienceBlock = isResilience
    ? `

RESILIENCE (criticality and cascade):
- Model ranking (1 = most critical): ${JSON.stringify(input.criticalityGroundTruth)}
- User ranking (node id -> rank): ${JSON.stringify(input.userCriticalityRanking)}
- Second shock (one hop further): ${JSON.stringify(input.secondShockEvent)}
Write "metaNote": 2-3 short sentences on which node the user most under- or over-rated, and whether their map could have predicted the cascade.`
    : "";

  return `You are a friendly coach helping a learner practice systems thinking in the domain: ${input.domain}.
The learner is still building this skill. Help them see WHY, so they can map it themselves next time.
User context (may be empty): ${ctx}

Exercise title: ${input.title}
Scenario:
---
${input.scenario}
---
Nodes: ${input.nodes.map((n) => `${n.id} = ${n.label} (${n.description})`).join("; ")}
The user's own 6 components before seeing the nodes: ${JSON.stringify(input.userProposedComponents ?? [])}

The shock: ${input.shockEvent.description}
Why the model marks nodes this way: ${input.shockEvent.explanation}

Connection types (arrow A -> B): ${Object.values(CONNECTION_TYPE_INFO)
    .map((t) => `"${t.label}" = ${t.meaning}`)
    .join(" ")}

SCORE (already decided by code - final, do not change or argue with it):
- Found ${r.connectionsFound} of ${r.connectionsTotal} model connections (${r.connectionsExact} with the same direction and type); drew ${r.extraEdgeIds.length} connections the model does not have.
- Of the ${r.impactsTotal} nodes the model or the user marks as affected, ${r.impactsCorrect} are marked the same as the model.
- Confidence before feedback: ${input.confidenceBefore}%.

CASES (each verdict is final):
${buildSystemsCoachingCases(input)}${geoBlock}${resilienceBlock}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "coaching_v3",
  "title": string (echo the exercise title),
  "items": [
    { "ref": string (a ref from CASES), "why": string, "clue": string, "nextTimeAsk": string }
  ],
  "takeaways": [] (always empty: the cards below replace them)${isGeo || isResilience ? `,
  "metaNote": string` : ""},
  "trapCards": [ { "trap": string (an idea id from TAKE-WITH-YOU CARDS), "othersSay": string, "youCouldSay": string, "elsewhere": { "area": string, "thought": string, "balanced": string } } ] (exactly one per idea below, same order)
}

TAKE-WITH-YOU CARDS (the user takes these systems ideas into real life; the app already shows how to spot each one and what to ask):
${cardLines || "(none)"}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}. You may add items for other refs in CASES, but keep it short.

How to write each item:
- "why": at most 2 short sentences. Follow the verdict:
  - CORRECT: confirm it plainly ("Yes - ..."), then say what makes it so.
  - DIFFERENT (node): explain how the shock does or does not reach this node, step by step through the connections.
  - MISSED: explain the link between the two nodes in simple words.
  - FOUND BUT REVERSED or OTHER TYPE: say which way or which type fits, and why. Be kind - they saw the link.
  - extra: judge fairly whether the link is reasonable even though the model left it out.
- "clue": the words in the scenario or node descriptions that signal it (quote 2-6 words).
- "nextTimeAsk": one question to ask yourself next time, at most 15 words.

How to write each card (plain words, not from this scenario):
- "othersSay": one short sentence a colleague, friend or family member might say that misses this idea (for example a plan that ignores a ripple effect).
- "youCouldSay": a kind reply that asks one question to help them see it. Never lecture and never use the idea's name. At most 25 words.
- "elsewhere": the same idea in a different area of life than "${input.domain}" (for example work, family, money, health, a city, a team). "area" is that area in 1-3 words; "thought" is a plan or claim that misses the idea; "balanced" is the same plan with the idea in mind.

Tone: warm and direct, like a patient coach. No numeric scores. No "stronger alternative". No academic words when a simple one works.
Refs (like issue_1, node_3, option_o1) are only for the "ref" field: in the text, always use names, never ids.`;
}
