import type { ReframeExerciseRow } from "@/lib/types/exercise";
import type { ReframeResult } from "@/lib/exercise/reframe-score";
import { answerName, REFRAME_TAG_INFO } from "@/lib/exercise/reframe-levels";
import { REFRAME_TRAP_GUIDE } from "@/lib/exercise/reframe-trap-guide";
import type { ReframeTag } from "@/lib/ai/validators/reframe";

/**
 * Coaching for Reframe: which thoughts were traps is decided in code (`scoreReframe`);
 * the AI explains each one and comments on the rewrite against three fixed questions.
 */
export function buildReframePerspectivePrompt(input: {
  exercise: ReframeExerciseRow;
  result: ReframeResult;
  requiredRefs: string[];
  /** Traps that get a card at the end, picked in code (pickTrapCards). */
  cardTraps: ReframeTag[];
  userContext?: string;
}): string {
  const ex = input.exercise;
  const r = input.result;
  const thoughtCases = ex.thoughts
    .map((t) => {
      const o = r.thoughts.find((x) => x.id === t.id)!;
      const planned =
        t.trap === "realistic"
          ? "REALISTIC (a fair thought, not a trap)"
          : `TRAP: ${REFRAME_TAG_INFO[t.trap].name}${t.alsoAccepted.length ? ` (also fair: ${t.alsoAccepted.map((a) => REFRAME_TAG_INFO[a].name).join(", ")})` : ""}`;
      const user = o.userAnswer ? answerName(o.userAnswer) : "(no answer)";
      const verdict =
        t.trap === "realistic"
          ? o.trapped
            ? `MARKED A FAIR THOUGHT AS A TRAP - chose ${user}.`
            : o.userAnswer
              ? "KEPT IT AS REALISTIC - right."
              : "NOT ANSWERED."
          : o.tagMatched
            ? `FOUND, RIGHT TRAP - chose ${user}.`
            : o.found
              ? `FOUND, OTHER TRAP NAME - chose ${user}. Finding it matters more than the name.`
              : `MISSED - chose ${user}.`;
      return `thought_${t.id} - "${t.text}"\n  Answer key: ${planned}. ${t.why}\n  User: ${verdict}`;
    })
    .join("\n\n");

  const target = ex.thoughts.find((t) => t.id === ex.rewrite.thoughtId);
  const picked = ex.rewriteChoice != null ? ex.rewrite.options[ex.rewriteChoice] : undefined;
  const rewriteCase =
    r.rewriteCorrect === null
      ? `rewrite - the user rewrote "${target?.text ?? ""}"
${ex.evidenceFor?.trim() ? `  Evidence for the thought: "${ex.evidenceFor.trim()}"\n` : ""}${ex.evidenceAgainst?.trim() ? `  Evidence against it: "${ex.evidenceAgainst.trim()}"\n` : ""}  Their balanced thought: "${ex.balancedThought?.trim() || "(nothing)"}"
  A reference version: "${ex.rewrite.balancedExample}"
  Judge it on three questions only: Is it based on evidence? Is it fair to the parts that really are bad? Or is it only positive thinking? Say what works, then the one change that would help most.`
      : `rewrite - "${target?.text ?? ""}"
  The user picked: "${picked ?? "(nothing)"}" - ${r.rewriteCorrect ? "the balanced one." : "NOT the balanced one."}
  The balanced one: "${ex.rewrite.options[ex.rewrite.answerIndex]}" (${ex.rewrite.explanation})`;

  const feeling =
    ex.feeling && ex.intensityBefore != null
      ? `The user named the feeling "${ex.feeling}" at ${ex.intensityBefore}/100${ex.intensityAfter != null ? `, and ${ex.intensityAfter}/100 after the rewrite` : ""}. Do not judge these numbers.`
      : "";
  const ctx = input.userContext?.trim() ? `\nUser context: ${input.userContext.trim()}` : "";
  const cards = input.cardTraps
    .map((t) => `- ${t} (${REFRAME_TAG_INFO[t].name}): ${REFRAME_TRAP_GUIDE[t].spot} How to respond to others: ${REFRAME_TRAP_GUIDE[t].othersTip}`)
    .join("\n");

  return `You are a warm, practical coach helping a beginner notice thinking traps (cognitive distortions) and think in a more balanced way. This is thinking practice, not therapy.${ctx}

Situation (${ex.domain}): ${ex.scenario}

Ideas the user studied first: ${ex.concepts.map((c) => `${c.term} (${c.plain})`).join("; ")}
${feeling}

RESULT (decided by code - final): traps found ${r.found}/${r.total}, right trap name ${r.tagsMatched}/${r.total}, fair thoughts marked as traps ${r.trapsHit}/${r.realisticTotal}.

CASES:
${thoughtCases}

${rewriteCase}

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "perspectiveFormat": "coaching_v3",
  "title": string (echo: "${ex.title.replace(/"/g, '\\"')}"),
  "items": [ { "ref": string (a ref from CASES), "why": string, "clue": string, "nextTimeAsk": string } ],
  "takeaways": [] (always empty: the trap cards below replace them),
  "metaNote": string (optional, see below),
  "trapCards": [ { "trap": string (a trap id from TRAP CARDS), "othersSay": string, "youCouldSay": string, "elsewhere": { "area": string, "thought": string, "balanced": string } } ] (exactly one per trap in TRAP CARDS, same order)
}

TRAP CARDS (the user will take these into real life; the app already shows how to spot each trap and what to ask):
${cards}

Write one item for each of these refs: ${input.requiredRefs.join(", ") || "(none)"}.

How to write each item:
- "why": at most 2 short sentences. For a trap: what the thought does, in plain words. For a fair thought marked as a trap: why it is fair - an unpleasant thought can still be true. For the rewrite: follow the three questions.
- "clue": the words in the thought that show it (quote 2-6 words). For the rewrite: a fact from the situation that supports the balanced thought (quote or name it). Never copy words from the answer options.
- "nextTimeAsk": one question to ask yourself when a thought like this comes, at most 15 words.
"metaNote": only if you see something about how the user worked across the thoughts that the items do not already say (for example, they kept calling fair thoughts traps). Never just repeat the score or praise it. Otherwise leave it out.

How to write each trap card (for this trap only, in plain words, first person for thoughts):
- "othersSay": one short sentence a friend, colleague or family member might say that falls into this trap. Not from this exercise's story.
- "youCouldSay": a kind reply to them: name their feeling, then ask one question that checks the facts. Never name the trap and never tell them they are wrong. At most 25 words.
- "elsewhere": the same trap in a different area of life than "${ex.domain}" (for example work, family, friends, money, health, study). "area" is that area in 1-3 words; "thought" is the trapped thought; "balanced" is a fair version that keeps the bad facts. Do not reuse the exercise's story or the rewrite.

Tone: warm and direct. No numeric grade. Never call the user's feelings wrong. No diagnosis and no therapy jargon beyond the trap names. Refs (like thought_t2) are only for the "ref" field: in the text, never write ids.`;
}
