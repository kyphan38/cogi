import { describe, expect, it } from "vitest";
import { scoreGeoGuess } from "./geo-guess";

const base = {
  hiddenPerspective: "ASEAN neutral broker framing",
  perspectiveOptions: ["US-aligned think tank", "ASEAN neutral broker framing", "Russian security narrative", "Global South developmentalist lens"],
  missingActors: ["Fishing communities", "Philippines"],
  lensQuestions: [
    { lens: "realist" as const, answerIndex: 0 },
    { lens: "liberal" as const, answerIndex: 1 },
    { lens: "constructivist" as const, answerIndex: 2 },
    { lens: "political_economy" as const, answerIndex: 0 },
  ],
};

describe("scoreGeoGuess", () => {
  it("gives full marks for the right viewpoint, both actors and all lenses", () => {
    const r = scoreGeoGuess({
      ...base,
      perspectiveChoice: 1,
      actorChoices: ["fishing communities", "Philippines"],
      lensAnswers: { realist: 0, liberal: 1, constructivist: 2, political_economy: 0 },
      lensFree: false,
    });
    expect(r).toMatchObject({ perspectiveCorrect: true, actorsFound: 2, actorsTotal: 2, wrongActors: 0, score: 100 });
  });

  it("takes points off for actors that are not missing and for wrong lenses", () => {
    const r = scoreGeoGuess({
      ...base,
      perspectiveChoice: 0,
      actorChoices: ["Philippines", "Vietnam"],
      lensAnswers: { realist: 0, liberal: 0 },
      lensFree: false,
    });
    expect(r.perspectiveCorrect).toBe(false);
    expect(r.actorsFound).toBe(1);
    expect(r.wrongActors).toBe(1);
    // actors: (1/2 - 0.25) * 30 = 7.5; lenses: 1/4 * 20 = 5
    expect(r.score).toBe(13);
  });

  it("scales up when lenses are written freely (Expert)", () => {
    const r = scoreGeoGuess({ ...base, perspectiveChoice: 1, actorChoices: [], lensAnswers: {}, lensFree: true });
    expect(r.lenses.every((l) => l.correct === null)).toBe(true);
    expect(r.score).toBe(63); // 50 / 80
  });
});
