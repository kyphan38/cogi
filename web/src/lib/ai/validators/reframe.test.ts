import { describe, expect, it } from "vitest";
import { REFRAME_LEVELS } from "@/lib/exercise/reframe-levels";
import { parseReframeExerciseJson, validateReframeSemantics, type ReframeExercisePayload } from "./reframe";

const guided = REFRAME_LEVELS.guided;
const opts = (ownSituation = false) => ({
  thoughtCount: guided.thoughtCount,
  realistic: guided.realistic,
  tags: guided.tags,
  ownSituation,
});

function payload(): ReframeExercisePayload {
  return {
    safety: "ok",
    title: "A late reply",
    scenario: "Lan sent a long message to a friend. Two days later, there is still no reply.",
    concepts: [
      { term: "Mind reading", plain: "Guessing what others think.", example: "\"He hates my idea\" before he says anything." },
      { term: "Realistic thought", plain: "A fair thought based on facts.", example: "\"I don't know yet why she is quiet.\"" },
    ],
    conceptChecks: [
      { question: "Which is mind reading?", options: ["She is angry with me", "She has not replied", "I sent it Monday"], answerIndex: 0, explanation: "It guesses her thoughts." },
    ],
    thoughts: [
      { id: "t1", text: "She is angry with me.", trap: "mind_reading", alsoAccepted: [], why: "A guess." },
      { id: "t2", text: "Our friendship is over.", trap: "catastrophizing", alsoAccepted: [], why: "Worst case." },
      { id: "t3", text: "Friends should reply the same day.", trap: "should_statements", alsoAccepted: [], why: "A rigid rule." },
      { id: "t4", text: "She has not replied for two days, and I miss her.", trap: "realistic", alsoAccepted: [], why: "Facts and a feeling." },
    ],
    rewrite: {
      thoughtId: "t2",
      question: "Which is the most balanced way to think about it?",
      options: ["One late reply does not end a friendship; I can ask how she is.", "It does not matter at all.", "I always lose friends."],
      answerIndex: 0,
      explanation: "It fits the facts.",
      balancedExample: "A slow reply can have many causes; I can check in.",
    },
  };
}

describe("validateReframeSemantics", () => {
  it("accepts a well-formed guided exercise", () => {
    expect(validateReframeSemantics(payload(), opts())).toEqual([]);
  });

  it("parses the JSON, with or without fences", () => {
    const parsed = parseReframeExerciseJson("```json\n" + JSON.stringify(payload()) + "\n```");
    expect(parsed.success).toBe(true);
  });

  it("rejects traps outside the level, wrong realistic counts and a realistic rewrite target", () => {
    const p = payload();
    p.thoughts[0]!.trap = "labeling";
    p.thoughts[1]!.trap = "realistic";
    p.rewrite.thoughtId = "t4";
    const errors = validateReframeSemantics(p, opts()).join("\n");
    expect(errors).toMatch(/t1: trap must be one of/);
    expect(errors).toMatch(/exactly 1 thought\(s\) must be realistic/);
    expect(errors).toMatch(/rewrite.thoughtId must be a distorted thought/);
  });

  it("rejects a realistic thought that already says the balanced rewrite", () => {
    const p = payload();
    p.thoughts[3]!.text = "One late reply does not end our friendship, and I can ask how she is doing.";
    expect(validateReframeSemantics(p, opts()).join("\n")).toMatch(/t4: this realistic thought repeats the balanced rewrite/);
  });

  it("checks ids, alsoAccepted and the rewrite options", () => {
    const p = payload();
    p.thoughts[0]!.id = "x";
    p.thoughts[1]!.alsoAccepted = ["catastrophizing"];
    p.thoughts[3]!.alsoAccepted = ["mind_reading"];
    p.rewrite.options = ["a", "a", "b"];
    const errors = validateReframeSemantics(p, opts()).join("\n");
    expect(errors).toMatch(/thought ids must be t1, t2, t3, t4/);
    expect(errors).toMatch(/alsoAccepted must not repeat trap/);
    expect(errors).toMatch(/a realistic thought has no alsoAccepted/);
    expect(errors).toMatch(/rewrite: options must be different/);
  });

  it("allows a safety concern only for the user's own situation", () => {
    const concern = { ...payload(), safety: "concern" as const, title: "", thoughts: [] };
    expect(validateReframeSemantics(concern, opts(true))).toEqual([]);
    expect(validateReframeSemantics(concern, opts(false))).toEqual(['safety must be "ok" for a made-up situation']);
  });
});
