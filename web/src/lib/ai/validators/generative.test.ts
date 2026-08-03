import { describe, expect, it } from "vitest";
import {
  parseGenerativeExerciseJson,
  validateGenerativeSemantics,
  validateGeopoliticsGenerativeSemantics,
  validateReframingGenerativeSemantics,
  validateInversionGenerativeSemantics,
} from "./generative";

const validPayload = {
  title: "Policy Analysis",
  scenario: "Evaluate impact of new trade regulations",
  prompts: [
    { id: "p1", question: "What is the main risk?" },
    { id: "p2", question: "What is the upside scenario?" },
    { id: "p3", question: "What is the downside scenario?" },
    { id: "p4", question: "What robust recommendation would you make now?" },
  ],
};

const editPayload = {
  ...validPayload,
  prompts: validPayload.prompts.map((p) => ({ ...p, draftText: "Draft text for editing." })),
};

const hintPayload = {
  ...validPayload,
  prompts: validPayload.prompts.map((p) => ({ ...p, hints: ["Hint 1", "Hint 2"] })),
};

describe("parseGenerativeExerciseJson", () => {
  it("parses valid payload", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(validPayload));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.prompts).toHaveLength(4);
  });

  it("fails on invalid JSON", () => {
    expect(parseGenerativeExerciseJson("bad").success).toBe(false);
  });

  it("fails when prompts count != 4", () => {
    const bad = { ...validPayload, prompts: validPayload.prompts.slice(0, 2) };
    expect(parseGenerativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when title exceeds max length", () => {
    const bad = { ...validPayload, title: "x".repeat(201) };
    expect(parseGenerativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when prompt id is empty", () => {
    const bad = { ...validPayload, prompts: validPayload.prompts.map((p, i) => (i === 0 ? { ...p, id: "" } : p)) };
    expect(parseGenerativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });
});

describe("validateGenerativeSemantics", () => {
  it("returns no errors for edit stage with draftText", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(editPayload));
    if (result.success) {
      expect(validateGenerativeSemantics(result.data, "edit")).toEqual([]);
    }
  });

  it("catches missing draftText in edit stage", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(validPayload));
    if (result.success) {
      const errors = validateGenerativeSemantics(result.data, "edit");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("draftText");
    }
  });

  it("returns no errors for hint stage with hints", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(hintPayload));
    if (result.success) {
      expect(validateGenerativeSemantics(result.data, "hint")).toEqual([]);
    }
  });

  it("catches missing hints in hint stage", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(validPayload));
    if (result.success) {
      const errors = validateGenerativeSemantics(result.data, "hint");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("hints");
    }
  });

  it("catches hints with wrong count", () => {
    const oneHint = { ...validPayload, prompts: validPayload.prompts.map((p) => ({ ...p, hints: ["Only one"] })) };
    const result = parseGenerativeExerciseJson(JSON.stringify(oneHint));
    if (result.success) {
      const errors = validateGenerativeSemantics(result.data, "hint");
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it("returns no errors for independent stage without draftText/hints", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(validPayload));
    if (result.success) {
      expect(validateGenerativeSemantics(result.data, "independent")).toEqual([]);
    }
  });

  it("catches draftText in independent stage", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(editPayload));
    if (result.success) {
      const errors = validateGenerativeSemantics(result.data, "independent");
      expect(errors.some((e) => e.includes("must not include draftText"))).toBe(true);
    }
  });

  it("catches hints in independent stage", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(hintPayload));
    if (result.success) {
      const errors = validateGenerativeSemantics(result.data, "independent");
      expect(errors.some((e) => e.includes("must not include hints"))).toBe(true);
    }
  });

  it("catches duplicate prompt ids", () => {
    const dup = { ...validPayload, prompts: validPayload.prompts.map((p) => ({ ...p, id: "same" })) };
    const result = parseGenerativeExerciseJson(JSON.stringify(dup));
    if (result.success) {
      const errors = validateGenerativeSemantics(result.data, "independent");
      expect(errors.some((e) => e.includes("unique"))).toBe(true);
    }
  });
});

describe("validateGeopoliticsGenerativeSemantics", () => {
  it("returns no errors for valid geo payload", () => {
    const geo = {
      ...validPayload,
      scenario: "a".repeat(400),
    };
    const result = parseGenerativeExerciseJson(JSON.stringify(geo));
    if (result.success) {
      expect(validateGeopoliticsGenerativeSemantics(result.data)).toEqual([]);
    }
  });

  it("catches short scenario", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(validPayload));
    if (result.success) {
      const errors = validateGeopoliticsGenerativeSemantics(result.data);
      expect(errors.some((e) => e.includes("400 characters"))).toBe(true);
    }
  });

  it("catches missing required prompt ids", () => {
    const bad = {
      ...validPayload,
      scenario: "a".repeat(400),
      prompts: [
        { id: "a", question: "Q1" },
        { id: "b", question: "Q2" },
        { id: "c", question: "Q3" },
        { id: "d", question: "Q4" },
      ],
    };
    const result = parseGenerativeExerciseJson(JSON.stringify(bad));
    if (result.success) {
      const errors = validateGeopoliticsGenerativeSemantics(result.data);
      expect(errors.some((e) => e.includes("missing prompt id p1"))).toBe(true);
    }
  });

  it("catches p4 without robust recommendation cue", () => {
    const bad = {
      ...validPayload,
      scenario: "a".repeat(400),
      prompts: validPayload.prompts.map((p) =>
        p.id === "p4" ? { ...p, question: "What do you think about this?" } : p,
      ),
    };
    const result = parseGenerativeExerciseJson(JSON.stringify(bad));
    if (result.success) {
      const errors = validateGeopoliticsGenerativeSemantics(result.data);
      expect(errors.some((e) => e.includes("robust recommendation"))).toBe(true);
    }
  });

  it("catches identical p2 and p3 questions", () => {
    const bad = {
      ...validPayload,
      scenario: "a".repeat(400),
      prompts: validPayload.prompts.map((p) =>
        p.id === "p3" ? { ...p, question: "What is the upside scenario?" } : p,
      ),
    };
    const result = parseGenerativeExerciseJson(JSON.stringify(bad));
    if (result.success) {
      const errors = validateGeopoliticsGenerativeSemantics(result.data);
      expect(errors.some((e) => e.includes("must differ"))).toBe(true);
    }
  });
});

describe("validateReframingGenerativeSemantics", () => {
  const reframingPayload = {
    title: "Reframe the onboarding problem",
    scenario: "Users are dropping off during onboarding.",
    prompts: [
      { id: "p1", question: "How might we reduce onboarding steps?" },
      { id: "p2", question: "What underlying need are users actually trying to satisfy?" },
      { id: "p3", question: "Whose problem is this really - the user's or the team's?" },
      { id: "p4", question: "What if the assumed time constraint wasn't real?" },
    ],
  };

  it("returns no errors for genuinely distinct reframes", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(reframingPayload));
    if (result.success) {
      expect(validateReframingGenerativeSemantics(result.data)).toEqual([]);
    }
  });

  it("catches near-duplicate reframing questions", () => {
    const dup = {
      ...reframingPayload,
      prompts: reframingPayload.prompts.map((p) => ({ ...p, question: reframingPayload.prompts[0]!.question })),
    };
    const result = parseGenerativeExerciseJson(JSON.stringify(dup));
    if (result.success) {
      const errors = validateReframingGenerativeSemantics(result.data);
      expect(errors.some((e) => e.includes("distinct"))).toBe(true);
    }
  });

  it("catches duplicate prompt ids", () => {
    const dup = {
      ...reframingPayload,
      prompts: reframingPayload.prompts.map((p) => ({ ...p, id: "same" })),
    };
    const result = parseGenerativeExerciseJson(JSON.stringify(dup));
    if (result.success) {
      const errors = validateReframingGenerativeSemantics(result.data);
      expect(errors.some((e) => e.includes("unique"))).toBe(true);
    }
  });
});

describe("validateInversionGenerativeSemantics", () => {
  const inversionPayload = {
    title: "Pre-mortem the product launch",
    scenario: "The team is launching a new feature next quarter.",
    prompts: [
      { id: "p1", question: "How could the launch fail due to a technical rollout issue?" },
      { id: "p2", question: "How could the launch fail due to a marketing miscommunication?" },
      { id: "p3", question: "How could the launch fail due to a silent adoption failure?" },
      { id: "p4", question: "Given these failure paths, what single change would you make today?" },
    ],
  };

  it("returns no errors for genuinely distinct failure paths", () => {
    const result = parseGenerativeExerciseJson(JSON.stringify(inversionPayload));
    if (result.success) {
      expect(validateInversionGenerativeSemantics(result.data)).toEqual([]);
    }
  });

  it("catches near-duplicate failure-path questions", () => {
    const dup = {
      ...inversionPayload,
      prompts: inversionPayload.prompts.map((p) => ({ ...p, question: inversionPayload.prompts[0]!.question })),
    };
    const result = parseGenerativeExerciseJson(JSON.stringify(dup));
    if (result.success) {
      const errors = validateInversionGenerativeSemantics(result.data);
      expect(errors.some((e) => e.includes("distinct"))).toBe(true);
    }
  });
});
