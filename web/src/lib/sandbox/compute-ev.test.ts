import { describe, expect, it } from "vitest";
import { computeSandboxEv } from "./compute-ev";
import type { SandboxDecisionInput } from "@/lib/types/sandbox";

function baseInput(overrides: Partial<SandboxDecisionInput> = {}): SandboxDecisionInput {
  return {
    decisionText: "test decision",
    branches: [
      { id: "b1", label: "No outage", probability: 0.85, payoff: 0 },
      { id: "b2", label: "Outage", probability: 0.15, payoff: -480_000 },
    ],
    fixedCost: 50_000,
    oneShot: false,
    reserves: 2_000_000,
    ...overrides,
  };
}

describe("computeSandboxEv", () => {
  it("computes EV as sum(probability * payoff) - fixedCost", () => {
    // Mirrors the ev-cloud-redundancy canonical scenario: 0.15 * -480k - 50k(as fixed cost
    // avoided) ... expressed here as "cost of NOT buying redundancy": expected outage cost
    // 0.15 * 480k = 72k, so declining redundancy has EV = -72k relative to the $0 baseline.
    const result = computeSandboxEv(baseInput());
    expect(result.ev).toBeCloseTo(0.15 * -480_000 - 50_000, 5);
  });

  it("does not flag ruin when the decision is repeated (not one-shot)", () => {
    const result = computeSandboxEv(
      baseInput({ oneShot: false, branches: [{ id: "b1", label: "Loss", probability: 1, payoff: -5_000_000 }], reserves: 2_000_000 }),
    );
    expect(result.ruinFlag).toBe(false);
    expect(result.ruinReason).toBeNull();
  });

  it("does not flag ruin when the worst loss is within reserves", () => {
    const result = computeSandboxEv(
      baseInput({
        oneShot: true,
        reserves: 2_000_000,
        branches: [
          { id: "b1", label: "Loss", probability: 0.1, payoff: -1_000_000 },
          { id: "b2", label: "No loss", probability: 0.9, payoff: 0 },
        ],
      }),
    );
    expect(result.ruinFlag).toBe(false);
  });

  it("flags ruin for a one-shot decision whose worst branch exceeds reserves", () => {
    // Mirrors ev-ruin-risk: 90% +$1M, 10% -$5M, reserves $2M, one-shot -> should flag.
    const result = computeSandboxEv({
      decisionText: "high stakes contract",
      branches: [
        { id: "b1", label: "Success", probability: 0.9, payoff: 1_000_000 },
        { id: "b2", label: "Compliance failure", probability: 0.1, payoff: -5_000_000 },
      ],
      fixedCost: 0,
      oneShot: true,
      reserves: 2_000_000,
    });
    expect(result.ev).toBeCloseTo(400_000, 5);
    expect(result.ruinFlag).toBe(true);
    expect(result.ruinReason).toContain("$5,000,000");
    expect(result.ruinReason).toContain("$2,000,000");
  });

  it("uses the single worst branch, not the sum of all negative branches", () => {
    const result = computeSandboxEv(
      baseInput({
        oneShot: true,
        reserves: 600_000,
        branches: [
          { id: "b1", label: "A", probability: 0.5, payoff: -500_000 },
          { id: "b2", label: "B", probability: 0.5, payoff: -500_000 },
        ],
      }),
    );
    // Worst single branch loss is 500k, which is within 600k reserves, even though the
    // branches sum to 1,000,000 - ruin risk is about surviving one realized outcome.
    expect(result.ruinFlag).toBe(false);
  });

  it("rounds EV to 2 decimal places", () => {
    const result = computeSandboxEv(
      baseInput({
        fixedCost: 0,
        branches: [
          { id: "b1", label: "x", probability: 1 / 3, payoff: 100 },
          { id: "b2", label: "y", probability: 2 / 3, payoff: 0 },
        ],
      }),
    );
    expect(result.validity.ok).toBe(true);
    expect(Number.isInteger((result.ev as number) * 100)).toBe(true);
  });

  it("every existing valid canonical case reports validity.ok = true", () => {
    const result = computeSandboxEv(baseInput());
    expect(result.validity).toEqual({ ok: true, reason: null });
    expect(result.ev).not.toBeNull();
  });
});

describe("computeSandboxEv — invalid probability inputs", () => {
  it("flags zero branches instead of computing an EV", () => {
    const result = computeSandboxEv(baseInput({ branches: [] }));
    expect(result.validity.ok).toBe(false);
    expect(result.validity.reason).toContain("No outcome branches");
    expect(result.ev).toBeNull();
    expect(result.ruinFlag).toBe(false);
  });

  it("flags branch probabilities that sum to less than 100%", () => {
    const result = computeSandboxEv(
      baseInput({ branches: [{ id: "b1", label: "Only outcome", probability: 0.8, payoff: -1000 }] }),
    );
    expect(result.validity.ok).toBe(false);
    expect(result.validity.reason).toContain("80.0%");
    expect(result.validity.reason).toContain("not 100%");
    expect(result.ev).toBeNull();
  });

  it("flags branch probabilities that sum to more than 100%", () => {
    const result = computeSandboxEv(
      baseInput({
        branches: [
          { id: "b1", label: "A", probability: 0.9, payoff: 100 },
          { id: "b2", label: "B", probability: 0.6, payoff: -100 },
        ],
      }),
    );
    expect(result.validity.ok).toBe(false);
    expect(result.validity.reason).toContain("150.0%");
    expect(result.ev).toBeNull();
  });

  it("flags a negative probability", () => {
    const result = computeSandboxEv(
      baseInput({
        branches: [
          { id: "b1", label: "A", probability: -0.1, payoff: 100 },
          { id: "b2", label: "B", probability: 1.1, payoff: -100 },
        ],
      }),
    );
    expect(result.validity.ok).toBe(false);
    expect(result.validity.reason).toContain("A");
    expect(result.ev).toBeNull();
  });

  it("flags a probability greater than 1", () => {
    const result = computeSandboxEv(
      baseInput({
        branches: [{ id: "b1", label: "Certain-ish", probability: 1.5, payoff: 100 }],
      }),
    );
    expect(result.validity.ok).toBe(false);
    expect(result.validity.reason).toContain("Certain-ish");
    expect(result.ev).toBeNull();
  });

  it("tolerates ordinary floating-point noise in a sum that is really 1", () => {
    const result = computeSandboxEv(
      baseInput({ branches: [{ id: "b1", label: "A", probability: 0.1 + 0.2 + 0.7, payoff: 0 }] }),
    );
    expect(result.validity.ok).toBe(true);
  });

  it("does not flag ruin risk when the input is invalid", () => {
    const result = computeSandboxEv(
      baseInput({ oneShot: true, reserves: 0, branches: [{ id: "b1", label: "A", probability: 0.5, payoff: -10_000_000 }] }),
    );
    expect(result.validity.ok).toBe(false);
    expect(result.ruinFlag).toBe(false);
    expect(result.ruinReason).toBeNull();
  });
});
