import type { StrategyExerciseRow } from "@/lib/types/exercise";
import type { StrategyResult } from "@/lib/exercise/strategy-score";
import { cellKey } from "@/lib/exercise/game";

/**
 * Coaching for a strategic situation. The game facts (best replies, equilibria,
 * dominant choices) are computed in code and are the truth; the AI explains them with
 * the terms the user learned first.
 */
export function buildStrategyPerspectivePrompt(input: {
  exercise: StrategyExerciseRow;
  result: StrategyResult;
  requiredRefs: string[];
  userContext?: string;
}): string {
  const ex = input.exercise;
  const r = input.result;
  const f = r.facts;
  const A = ex.players.find((p) => p.id === "A")!;
  const B = ex.players.find((p) => p.id === "B")!;
  const optA = (id: string) => ex.optionsA.find((o) => o.id === id)?.label ?? id;
  const optB = (id: string) => ex.optionsB.find((o) => o.id === id)?.label ?? id;
  const cellName = (key: string) => {
    const [a, b] = key.split("|");
    return `${A.name}: ${optA(a!)} + ${B.name}: ${optB(b!)}`;
  };
  const list = (keys: string[]) => (keys.length ? keys.map(cellName).join("; ") : "none");
  const matrix = ex.cells
    .map((c) => `- ${cellName(cellKey(c.a, c.b))} -> ${A.name} ${c.payoffA}, ${B.name} ${c.payoffB}. ${c.story}`)
    .join("\n");

  const cases: string[] = [];
  for (const b of r.bestReplies) {
    const [player, opp] = b.key.split(":") as ["A" | "B", string];
    const ref = `br_${player}_${opp}`;
    const want = player === "A" ? optA(f.bestA[opp]!) : optB(f.bestB[opp]!);
    const given = b.given ? (player === "A" ? optA(b.given) : optB(b.given)) : "(nothing)";
    const who = player === "A" ? A.name : B.name;
    const other = player === "A" ? `${B.name} picks ${optB(opp)}` : `${A.name} picks ${optA(opp)}`;
    cases.push(`${ref} - best reply of ${who} when ${other}: ${b.correct ? `CORRECT (${want}).` : `DIFFERENT - user said ${given}; the best reply is ${want}.`}`);
  }
  if (r.rankCloseness) {
    for (const p of ["A", "B"] as const) {
      const name = p === "A" ? A.name : B.name;
      const user = ex.answers?.ranks?.[p] ?? [];
      cases.push(`rank_${p} - how ${name} ranks the outcomes: ${Math.round(r.rankCloseness[p] * 100)}% close to the model. User's order: ${user.map(cellName).join(" > ")}`);
    }
  }
  cases.push(
    `prediction - where they end up: user predicted ${list(ex.answers?.prediction ?? [])}; the equilibrium is ${list(f.nash)}. ${
      r.predictionCorrect ? "CORRECT." : "DIFFERENT."
    }${r.predictionConsistent === true && !r.predictionCorrect ? " It DOES follow from the user's own ranking - their logic is right, their view of the preferences differs." : ""}${
      r.predictionConsistent === false ? ` From the user's own ranking the equilibrium would be ${list(r.impliedNash ?? [])}.` : ""
    }`,
  );
  if (r.dominant) {
    for (const p of ["A", "B"] as const) {
      const truth = p === "A" ? (f.dominantA ? optA(f.dominantA) : "none") : f.dominantB ? optB(f.dominantB) : "none";
      const givenId = ex.answers?.dominant?.[p] ?? "none";
      const given = givenId === "none" ? "none" : p === "A" ? optA(givenId) : optB(givenId);
      cases.push(`dominant_${p} - dominant choice of ${p === "A" ? A.name : B.name}: ${r.dominant[p] ? `CORRECT (${truth}).` : `DIFFERENT - user said ${given}; the answer is ${truth}.`}`);
    }
  }
  if (r.betterCorrect !== null) {
    cases.push(`better - outcomes better for both than the equilibrium: user said ${list(ex.answers?.betterForBoth ?? [])}; the answer is ${list(f.betterForBoth)}. ${r.betterCorrect ? "CORRECT." : "DIFFERENT."}`);
  }

  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext.trim()}` : "";
  return `You are a warm, practical coach teaching a beginner game theory through real stories.${ctx}

Story: ${ex.scenario}
${A.name} (A) wants: ${A.goal}. ${B.name} (B) wants: ${B.goal}.
Outcomes (payoff 0-10, higher is better for that player):
${matrix}

Terms the user studied first: ${ex.concepts.map((c) => `${c.term} (${c.plain})`).join("; ")}

FACTS (computed by code - these are the truth; if anything else disagrees, trust these):
- Best replies of ${A.name}: ${Object.entries(f.bestA).map(([b, a]) => `if ${B.name} ${optB(b)} -> ${optA(a)}`).join("; ")}
- Best replies of ${B.name}: ${Object.entries(f.bestB).map(([a, b]) => `if ${A.name} ${optA(a)} -> ${optB(b)}`).join("; ")}
- Equilibrium (where both play a best reply): ${list(f.nash)}
- Dominant choice: ${A.name} ${f.dominantA ? optA(f.dominantA) : "none"}; ${B.name} ${f.dominantB ? optB(f.dominantB) : "none"}
- Better for both than the equilibrium: ${list(f.betterForBoth)}

CASES (each verdict is final):
${cases.join("\n")}

The user's reason for their prediction: "${ex.userWhy?.trim() || "(none given)"}"

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "coaching_v3",
  "title": string (echo: "${ex.title.replace(/"/g, '\\"')}"),
  "items": [ { "ref": string (a ref from CASES), "why": string, "clue": string, "nextTimeAsk": string } ],
  "takeaways": [string] (1-2 items),
  "metaNote": string
}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}.

How to write each item:
- "why": at most 2 short sentences. Use the studied terms by name where they fit (best reply, equilibrium, dominant strategy...). CORRECT: confirm and say why. DIFFERENT: walk through the comparison step by step with the payoff numbers.
- "clue": the words in the story that show it (quote 2-6 words).
- "nextTimeAsk": one question to ask yourself in a similar situation, at most 15 words.
"metaNote": 1-2 sentences on the user's reason: what it gets right and what it leaves out.
"takeaways": 1-2 lessons that carry to real life (pricing, negotiation, teamwork...).

Tone: warm and plain. No numeric grade. No "stronger alternative". Refs (like br_A_b1, rank_A) are only for the "ref" field: in the text, use names, never ids.`;
}
