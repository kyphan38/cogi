import { describe, expect, it } from "vitest";
import { makeQuizRow, makeStraitRow, placesAskedOn, quizAttempts, quizDoneOn, GEO_LAB_DOMAIN } from "./rows";
import { localDay } from "./quiz";
import { scoreStrait } from "./strait";
import { chokepointById } from "./chokepoints";
import type { Exercise } from "@/lib/types/exercise";

const at = (iso: string) => new Date(iso);

describe("Geo Lab rows", () => {
  const q1 = makeQuizRow(
    [
      { placeId: "hanoi", tap: [105.9, 21], distanceKm: 5, correct: true },
      { placeId: "tokyo", tap: null, distanceKm: null, correct: false },
    ],
    "2026-10-03T08:00:00.000Z",
    at("2026-10-03T08:02:00.000Z"),
  );
  const q2 = makeQuizRow([{ placeId: "tokyo", tap: [139.7, 35.7], distanceKm: 3, correct: true }], "2026-10-04T08:00:00.000Z", at("2026-10-04T08:02:00.000Z"));
  const other = { id: "x", type: "calibration", completedAt: "2026-10-04T09:00:00.000Z" } as unknown as Exercise;

  it("builds finished rows with a fixed domain and a clear title", () => {
    expect(q1).toMatchObject({ type: "geo", variant: "map_quiz", domain: GEO_LAB_DOMAIN, title: "Map quiz", aiPerspective: null });
    const cp = chokepointById("suez")!;
    const strait = makeStraitRow({ chokepointId: "suez", picked: ["818"], route: "cape", result: scoreStrait(cp, ["818"], "cape") }, "2026-10-04T08:00:00.000Z");
    expect(strait.title).toBe("Close the strait: Suez Canal");
    expect(strait.strait?.explanation).toBeNull();
  });

  it("turns finished quizzes into attempts, oldest first, and ignores other rows", () => {
    const attempts = quizAttempts([q2, other, q1]);
    expect(attempts.map((a) => `${a.placeId}:${a.correct}`)).toEqual(["hanoi:true", "tokyo:false", "tokyo:true"]);
    expect(attempts[0]!.day).toBe(localDay(at("2026-10-03T08:02:00.000Z")));
  });

  it("knows what was asked today and whether today's quiz is done", () => {
    const today = localDay(at("2026-10-04T08:02:00.000Z"));
    expect([...placesAskedOn([q1, q2], today)]).toEqual(["tokyo"]);
    expect(quizDoneOn([q1, q2], today)).toBe(true);
    expect(quizDoneOn([q1], today)).toBe(false);
  });
});
