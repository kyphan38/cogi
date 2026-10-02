import type {
  EvaluativeMatrixRow,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
} from "@/lib/types/exercise";
import type { EvaluativeQuadrant } from "@/lib/ai/validators/evaluative";
import {
  quadrantName,
  type MatrixResult,
  type ScoringResult,
  type UncertaintyResult,
} from "@/lib/exercise/evaluative-score";

function coachingContract(input: {
  title: string;
  requiredRefs: string[];
  metaNote?: string;
  verdictRules: string;
}): string {
  return `Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "coaching_v3",
  "title": string (echo: "${input.title.replace(/"/g, '\\"')}"),
  "items": [
    { "ref": string (a ref from CASES), "why": string, "clue": string, "nextTimeAsk": string }
  ],
  "takeaways": [string] (1-2 items)${input.metaNote ? `,
  "metaNote": string` : ""}
}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}. You may add items for other refs in CASES, but keep it short.

How to write each item:
- "why": at most 2 short sentences. ${input.verdictRules}
- "clue": the words in the scenario or option that point to it (quote 2-6 words).
- "nextTimeAsk": one question to ask yourself next time, at most 15 words.
${input.metaNote ? `\n"metaNote": ${input.metaNote}\n` : ""}
"takeaways": 1-2 short lessons for the next decision. Focus on the biggest differences first. If everything matched, say what to keep doing.

Tone: warm and direct, like a patient coach. No numeric grade. No "stronger alternative". No academic words when a simple one works. Write option and criterion names plainly, without quotation marks.`;
}

function header(kind: string, domain: string, title: string, scenario: string, confidence: number, userContext?: string): string {
  const ctx = userContext?.trim() ? `\nUser context: ${userContext.trim()}` : "";
  return `You are a friendly coach helping a learner practice ${kind} in the domain: ${domain}.
The learner is still building this skill. Help them see WHY, so they can judge it themselves next time.${ctx}

Title: ${title}
Scenario:
${scenario}

Confidence before feedback: ${confidence}%`;
}

export function buildEvaluativeMatrixPerspectivePrompt(input: {
  title: string;
  domain: string;
  scenario: string;
  exercise: EvaluativeMatrixRow;
  result: MatrixResult;
  requiredRefs: string[];
  confidenceBefore: number;
  userContext?: string;
}): string {
  const ex = input.exercise;
  const q = (v: EvaluativeQuadrant) => quadrantName(v, ex.axisX, ex.axisY);
  const cases = input.result.placements
    .map((p) => {
      const o = ex.options.find((x) => x.id === p.optionId)!;
      const verdict = p.correct
        ? `CORRECT - placed in ${q(p.user!)}.`
        : p.user
          ? `DIFFERENT - placed in ${q(p.user)}; the model puts it in ${q(p.intended)}.`
          : `NOT PLACED - the model puts it in ${q(p.intended)}.`;
      return `option_${o.id} - ${o.title}: ${o.description}\n  Model's note: ${o.explanation}\n  User: ${verdict}`;
    })
    .join("\n\n");

  return `${header("judging options on two criteria (a 2x2 matrix)", input.domain, input.title, ex.scenario, input.confidenceBefore, input.userContext)}

Axes: ${ex.axisX.label} (${ex.axisX.lowLabel} -> ${ex.axisX.highLabel}) and ${ex.axisY.label} (${ex.axisY.lowLabel} -> ${ex.axisY.highLabel}).
Criteria the user proposed before seeing the axes: ${JSON.stringify(ex.userProposedCriteria ?? [])}

SCORE (decided by code - final): placed ${input.result.correct} of ${input.result.total} options in the same quadrant as the model.

CASES (each verdict is final):
${cases}

${coachingContract({
  title: input.title,
  requiredRefs: input.requiredRefs,
  verdictRules:
    "CORRECT: confirm plainly, then say what puts it there. DIFFERENT: explain which axis the user misjudged and why, in simple words; the model's view is a reasoned reference, so say \"the model sees it as...\", not \"you are wrong\". NOT PLACED: explain where it belongs.",
})}`;
}

export function buildEvaluativeScoringPerspectivePrompt(input: {
  title: string;
  domain: string;
  exercise: EvaluativeScoringRow;
  result: ScoringResult;
  requiredRefs: string[];
  confidenceBefore: number;
  userContext?: string;
}): string {
  const ex = input.exercise;
  const optionTitle = (id: string) => ex.options.find((o) => o.id === id)?.title ?? id;
  const cases = input.result.criteria
    .map((c) => {
      const crit = ex.criteria.find((x) => x.id === c.criterionId)!;
      const weight =
        c.gap === 0
          ? `SAME WEIGHT - both ${c.userWeight}/5.`
          : `${Math.abs(c.gap) >= 2 ? "BIG" : "SMALL"} WEIGHT GAP - user ${c.userWeight}/5, model ${c.modelWeight}/5 (user weighted it ${c.gap > 0 ? "higher" : "lower"}).`;
      const cells = input.result.bigCells
        .filter((cell) => cell.criterionId === c.criterionId)
        .map((cell) => `${optionTitle(cell.optionId)}: user ${cell.user}, model ${cell.model}`);
      return [
        `criterion_${crit.id} - ${crit.label}${crit.isDealbreaker ? " (dealbreaker: a score under 3 rules an option out)" : ""}: ${crit.description}`,
        `  User: ${weight}`,
        cells.length ? `  Scores far from the model: ${cells.join("; ")}` : "  Scores: close to the model.",
      ].join("\n");
    })
    .join("\n\n");
  const ranking = (ids: string[]) => (ids.length ? ids.map(optionTitle).join(" > ") : "(none left)");
  const geo =
    ex.isGeopolitics || ex.stakeholderNote
      ? `\nStakeholders (geopolitics): model view: ${ex.stakeholderNote ?? "(none)"}; user's mapping: ${JSON.stringify(ex.userStakeholderMapping ?? [])}.`
      : "";

  return `${header("weighing options against several criteria", input.domain, input.title, ex.scenario, input.confidenceBefore, input.userContext)}

Criteria the user proposed before seeing the table: ${JSON.stringify(ex.userProposedCriteria ?? [])}
Criteria the model thinks are easy to miss (hidden): ${ex.hiddenCriteria.map((h) => `${h.label} - ${h.description}`).join("; ") || "(none)"}${geo}
Model notes per option: ${ex.options.map((o) => `${o.title}: ${o.explanation}`).join(" | ")}

COMPARISON (decided by code - final). Weights and scores are judgment calls: the model's numbers are a reasoned reference, not the one right answer.
- User's ranking: ${ranking(input.result.userOrder)}
- Model's ranking: ${ranking(input.result.modelOrder)}
- Same best option: ${input.result.topMatch ? "yes" : "no"}

CASES:
${cases}

${coachingContract({
  title: input.title,
  requiredRefs: input.requiredRefs,
  metaNote: `2-3 short sentences comparing the criteria the user proposed with the table's criteria and the hidden ones${geo ? ", and whose interests their stakeholder mapping left out" : ""}.`,
  verdictRules:
    "SAME or SMALL gap: say briefly why that weight makes sense. BIG gap: explain what in the scenario makes this criterion matter more or less, and how it changed the ranking. For scores far from the model, name the fact about the option that the user may have missed. Never call a weight wrong - say how the model sees it differently.",
})}`;
}

export function buildEvaluativeUncertaintyPerspectivePrompt(input: {
  title: string;
  domain: string;
  exercise: EvaluativeUncertaintyRow;
  result: UncertaintyResult;
  requiredRefs: string[];
  confidenceBefore: number;
  userContext?: string;
}): string {
  const ex = input.exercise;
  const optionTitle = (id: string) => ex.options.find((o) => o.id === id)?.title ?? id;
  const cases = input.result.options
    .map((r) => {
      const o = ex.options.find((x) => x.id === r.optionId)!;
      const outcomes = o.outcomes
        .map((out) => {
          const p = ex.userProbabilities[o.id]?.[out.id];
          const pay = ex.userPayoffs[o.id]?.[out.id];
          return `    ${out.label}: model chance ${out.probability}, payoff ${out.payoff}; user chance ${p ?? "n/a"}, payoff ${pay ?? "n/a"} - ${out.explanation}`;
        })
        .join("\n");
      const verdict =
        r.userEv == null
          ? "NO EXPECTED VALUE - the user's chances do not add up to 100%."
          : r.modelEv == null
            ? `User expected value ${r.userEv}.`
            : Math.abs(r.userEv - r.modelEv) <= Math.max(1, Math.abs(r.modelEv) * 0.1)
              ? `CLOSE - user expected value ${r.userEv}, model ${r.modelEv}.`
              : `${r.userEv > r.modelEv ? "MORE OPTIMISTIC" : "MORE CAUTIOUS"} - user expected value ${r.userEv}, model ${r.modelEv}.`;
      return `option_${o.id} - ${o.title}: ${o.description}\n${outcomes}\n  User: ${verdict}`;
    })
    .join("\n\n");
  const ranking = (ids: string[]) => (ids.length ? ids.map(optionTitle).join(" > ") : "(none)");
  const intuition = ex.outcomeIntuitionText?.trim() ? `\nThe user's first intuition: ${ex.outcomeIntuitionText.trim()}` : "";

  return `${header("deciding under uncertainty (chances and payoffs)", input.domain, input.title, ex.scenario, input.confidenceBefore, input.userContext)}${intuition}

COMPARISON (decided by code - final). The model's chances are a reasoned reference, not certain truth.
- User's ranking by expected value: ${ranking(input.result.userOrder)}
- Model's ranking: ${ranking(input.result.modelOrder)}
- Same best option: ${input.result.topMatch ? "yes" : "no"}

CASES:
${cases}

${coachingContract({
  title: input.title,
  requiredRefs: input.requiredRefs,
  verdictRules:
    "CLOSE: confirm and say which estimate mattered most. MORE OPTIMISTIC / MORE CAUTIOUS: name the one chance or payoff that drove the gap and what in the scenario suggests the model's number. NO EXPECTED VALUE: explain that chances for one option must add up to 100%.",
})}`;
}
