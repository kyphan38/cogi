# Phase 5 - Sequential: Variant Round-Out Implementation Plan

> **Roadmap context:** Part of the **"round out each thinking mode with its own exercise variants"**
> 6-phase roadmap (one phase per `ThinkingType`). Distinct from `docs/PHASE1..5_IMPLEMENTATION.md`
> (older, unrelated app-wide MVP milestones).
>
> Roadmap status:
> - ✅ Phase 1 - Analytical
> - ✅ Phase 2 - Generative
> - ✅ Phase 3 - Evaluative
> - ⬜/🚧 Phase 4 - Systems (`docs/VARIANTS_PHASE4_SYSTEMS.md`)
> - 🚧 **Phase 5 - Sequential (this doc)**
> - ⬜ Phase 6 - Combo (`docs/VARIANTS_PHASE6_COMBO.md`)

## 1. Current state audit (grounded in code)

Sequential is the **least developed** of the six thinking modes: it has exactly one schema, one
prompt, no domain-aware variant, and no user-facing task-type selector. It's the largest gap in the
roadmap.

| Concern | File | What exists today |
|---|---|---|
| Schema | `src/lib/ai/validators/sequential.ts` (`sequentialExerciseSchema`) | `title`, `scenario`, `steps` (6-10, each with `id`/`text`/`correctPosition`/`dependencies`/`isFlexible`/`explanation`), `criticalErrors` (≥1, severity `catastrophic\|problematic\|suboptimal`). **No `variant` field, no geopolitics schema, no second variant of any kind.** |
| Prompt | `src/lib/ai/prompts/sequential.ts` | Single `buildSequentialGenerationPrompt()`. **No `buildGeopoliticsSequentialPrompt` (every other mode has one).** |
| Domain detection | `isGeopoliticsAnalyticalDomain()` in `src/lib/exercise/geopolitics-domains.ts` | Shared helper - **never called for `exerciseType === "sequential"`** in `route.ts`. |
| Route dispatch | `src/app/api/ai/route.ts`, `if (exerciseType === "sequential")` (~L509) | Calls `buildSequentialGenerationPrompt` unconditionally - no branching on domain or task type at all. |
| Perspective plumbing | `kind === "sequential"` branch in `src/app/api/ai/perspective/route.ts` (~L421) | Forwards `userOrderedStepIds`, `criticalErrors`, `steelmanText`-equivalent context - plain, no geopolitics fields (contrast with the `systems` branch which already forwards `perspectiveAName/B`). |
| Step labels | `src/components/shared/ExerciseShell.tsx` | Only `SEQUENTIAL_EXERCISE_STEP_LABELS` (7 steps). **No `GEOPOLITICS_SEQUENTIAL_STEP_LABELS`.** |
| UI | `src/components/exercises/SequentialExerciseFlow.tsx`, `SequenceDrag.tsx` | No task-type selector at all (not even an `"auto"` no-op like the others would have) - the setup screen only has `entryMode`/`setupMode` (suggested vs manual domain, generated vs custom scenario), same as every mode, but nothing variant-specific. |
| Types | `src/lib/types/exercise.ts` | No `SequentialTaskType` export. |
| Combo usage | `src/lib/ai/validators/combo-bundle.ts` (`rootCauseSchema`), `src/lib/ai/prompts/combo.ts` | `root_cause` preset already embeds base `sequentialExerciseSchema` - will need to stay compatible with whatever new variant is added (Phase 6 decides whether combo opts in). |

## 2. Design: two deliverables, matching the size of Phase 3's two additions

### 2a. Geopolitics domain parity (closes the biggest, most visible gap)

Every other generative-payload mode (Analytical, Generative, Evaluative, Systems) has a geopolitics
counterpart reachable via the shared `isGeopoliticsAnalyticalDomain()` detector. Sequential does not.
Add a **dual-actor sequencing** geopolitics variant: the same crisis/process is sequenced from **two
actors' priorities**, and their optimal orders diverge (e.g. "Actor A's diplomatic-first sequence"
vs "Actor B's deterrence-first sequence" for the same 8 steps) - this mirrors Systems'
`perspectiveA/B` split and Evaluative's stakeholder framing, applied to ordering instead of scoring.

```ts
// src/lib/ai/validators/sequential.ts
export const sequentialGeopoliticsStepSchema = stepSchema.extend({
  /** Actor B's correct position for this SAME step id - orders may legitimately differ from Actor A's. */
  correctPositionB: z.number().int().nonnegative(),
});

export const sequentialGeopoliticsExerciseSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  perspectiveAName: z.string().min(1),
  perspectiveBName: z.string().min(1),
  steps: z.array(sequentialGeopoliticsStepSchema).min(6).max(10),
  /** Errors specific to getting Actor A's order wrong. */
  criticalErrors: z.array(criticalErrorSchema).min(1),
  /** Errors specific to getting Actor B's order wrong (kept separate - different actor, different stakes). */
  criticalErrorsB: z.array(criticalErrorSchema).min(1),
});
export type SequentialGeopoliticsExercisePayload = z.infer<typeof sequentialGeopoliticsExerciseSchema>;
```

UX: user orders steps once for Actor A (existing `SequenceDrag.tsx` interaction), then - new step -
re-orders (or confirms) for Actor B, then sees both critical-error sets in the AI reflection.

### 2b. New mechanic variant: **Crisis Triage** (`"triage"`)

Rationale: Phase 3 added not just a domain reskin (the "Geopolitics" evaluative flavor is folded
into `scoring`) but a genuinely new *mechanic* (`uncertainty` = EV estimation). Sequential's analogous
mechanic-level addition: severity-weighted ordering under **time pressure**, where getting
high-severity steps in the right relative order matters more than getting low-severity ones exactly
right (non-uniform scoring, same "not all mistakes are equal" idea as `isDealbreaker`).

```ts
// src/lib/ai/validators/sequential.ts
export const triageStepSchema = stepSchema.extend({
  severity: z.enum(["critical", "major", "minor"]),
});

export const sequentialTriageExerciseSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  timeLimitMinutes: z.number().int().min(1).max(180),
  steps: z.array(triageStepSchema).min(6).max(10),
  criticalErrors: z.array(criticalErrorSchema).min(1),
});
export type SequentialTriageExercisePayload = z.infer<typeof sequentialTriageExerciseSchema>;
```

Scoring note for the calibration layer (`src/lib/analytics/calibration-evaluative.ts`-equivalent -
check whether a `calibration-sequential.ts` exists yet; if not, this is the first mode needing
weighted-accuracy scoring, so add `computeSequentialTriageAccuracy()` with severity weights
`critical=3, major=2, minor=1`, same "mean absolute error" style as
`computeEvaluativeUncertaintyAccuracy`).

## 3. File-by-file checklist

### Validators - `src/lib/ai/validators/sequential.ts`
- [ ] Add `SequentialTaskType = "auto" | "geopolitics" | "triage"` export.
- [ ] Add `sequentialGeopoliticsStepSchema`, `sequentialGeopoliticsExerciseSchema`, `SequentialGeopoliticsExercisePayload`.
- [ ] Add `triageStepSchema`, `sequentialTriageExerciseSchema`, `SequentialTriageExercisePayload`.
- [ ] Add `isGeopoliticsSequentialPayload()` / `isTriageSequentialPayload()` type guards (mirror `isGeopoliticsSystemsPayload`).
- [ ] Convert `parseSequentialExerciseJson` into a 3-way dispatch (base/geopolitics/triage) exactly like `parseEvaluativeExerciseJson`'s union handling, keeping `stripJsonFences` shared.
- [ ] Add `validateGeopoliticsSequentialSemantics(data)`: step id sets identical across A/B ordering (no missing/extra ids), `correctPositionB` values form a valid permutation, `criticalErrorsB` non-empty, dependency graph (if reused) has no cycle.
- [ ] Add `validateSequentialTriageSemantics(data)`: at least one `"critical"` severity step exists, `timeLimitMinutes` sane bound, `correctPosition` values form a valid permutation.
- [ ] Add retry-suffix constants: `GEOPOLITICS_SEQUENTIAL_RETRY_SUFFIX`, `SEQUENTIAL_TRIAGE_RETRY_SUFFIX` (naming parallel to `GEOPOLITICS_SYSTEMS_RETRY_SUFFIX` / `GEOPOLITICS_EVALUATIVE_RETRY_SUFFIX`).
- [ ] Unit tests in `sequential.test.ts`: valid/invalid payloads for both new schemas, permutation-integrity checks, missing-id checks, severity-weight edge cases.

### Prompts - `src/lib/ai/prompts/sequential.ts`
- [ ] Add `buildGeopoliticsSequentialPrompt(input: { domain; userContext?; adaptationAppendix?; customScenario? }): string` - reuse `formatUserScenarioBlock`/`buildDomainHint`; instruct the model that Actor A and Actor B have genuinely different priority orders for the *same* step set (not just relabeled), require `correctPositionB` for every step, require `criticalErrorsB` distinct from `criticalErrors`.
- [ ] Add `buildSequentialTriagePrompt(input: { domain; userContext?; adaptationAppendix?; customScenario? }): string` - instruct exactly one severity tier composition guidance (e.g. "at least 2 critical, 2 major, 2 minor across the 6-10 steps"), require `timeLimitMinutes` proportional to step count, keep severity language out of `scenario` text (hidden ground truth, same discipline as Evaluative's hidden criteria).
- [ ] Prompt unit tests: assert required field names/keywords appear in each builder's output (mirror existing `toContain` assertions in `sequential.test.ts`/`evaluative.test.ts`).

### Route dispatch - `src/app/api/ai/route.ts`
- [ ] Read `sequentialTaskType` from body, default `"auto"` (mirror `rawEvaluativeTaskType` pattern ~L187-189).
- [ ] Inside `if (exerciseType === "sequential")` (~L509): branch on `sequentialTaskType === "auto" ? isGeopoliticsAnalyticalDomain(effectiveDomain) : sequentialTaskType === "geopolitics"` → `buildGeopoliticsSequentialPrompt`; `sequentialTaskType === "triage"` → `buildSequentialTriagePrompt`; else base `buildSequentialGenerationPrompt`.
- [ ] Add matching parse/validate branch (3-way) + correct retry-suffix selection on semantic failure, mirroring the evaluative ternary chain (~L200-260).

### Perspective route - `src/app/api/ai/perspective/route.ts`
- [ ] In `kind === "sequential"` (~L421): accept and forward `perspectiveAName`/`perspectiveBName`/`userOrderedStepIdsB`/`criticalErrorsB` when the geopolitics variant is active, and `severity`/`timeLimitMinutes`/elapsed-time context when the triage variant is active.
- [ ] `src/lib/ai/prompts/sequential-perspective.ts`: extend `buildSequentialPerspectivePrompt` to comment on both actors' orderings (geopolitics) or on severity-weighted accuracy (triage), same tone as existing reflection copy.

### Step labels - `src/components/shared/ExerciseShell.tsx`
- [ ] Add `GEOPOLITICS_SEQUENTIAL_STEP_LABELS`: `["Setup", "Order steps (Actor A)", "Order steps (Actor B)", "Confidence", "AI perspective", "Journal", "Action", "Done"]`.
- [ ] Add `SEQUENTIAL_TRIAGE_STEP_LABELS`: `["Setup", "Order under time pressure", "Confidence", "AI perspective", "Journal", "Action", "Done"]` (same length as base, distinct label wording for step 2).

### UI - `src/components/exercises/SequentialExerciseFlow.tsx`
- [ ] Add `sequentialTaskType` `<Select>` in setup screen (options: "Auto", "Geopolitical (two actors)", "Crisis triage") - first task-type control this mode has ever had, so also add the corresponding request-body wiring (currently absent).
- [ ] Geopolitics: after the existing `SequenceDrag.tsx` step for Actor A, add a second drag step for Actor B reusing the same component with a different `steps`/`correctPosition` prop set; show both actors' critical errors in the AI-perspective step.
- [ ] Triage: render `severity` badges on each draggable step (reuse `HighlightTag.tsx`/badge styling conventions), add a visible countdown using `timeLimitMinutes` (check for an existing countdown/timer utility before building a new one - search `useEffect.*setInterval` in exercise flows first), and compute weighted accuracy client-side for the confidence/score display (reuse `EvaluativeWeightAlignment.tsx`'s weighted-score patterns as a UI reference if useful).
- [ ] Wire `stepLabels` prop across base/geopolitics/triage.
- [ ] Persist new fields on the row (see Types below).

### Types - `src/lib/types/exercise.ts`
- [ ] Export `SequentialTaskType` (re-export pattern, alongside `EvaluativeQuadrant`/`GenerativeStage`).
- [ ] Extend the sequential row interface with `variantKind?: "geopolitics" | "triage"`, `perspectiveAName?`, `perspectiveBName?`, `userOrderedStepIdsB?`, `criticalErrorsB?`, `severity` per step, `timeLimitMinutes?`.

### Analytics / calibration
- [ ] Check `src/lib/analytics/` for an existing sequential accuracy function; if none, add `computeSequentialTriageAccuracy()` (severity-weighted MAE-style, mirror `computeEvaluativeUncertaintyAccuracy` in `src/lib/analytics/calibration-evaluative.ts`) plus its unit test file (`calibration-sequential.test.ts`).

### Tests
- [ ] Unit: `sequential.test.ts` (validator + prompts), new `calibration-sequential.test.ts` if the accuracy function is added.
- [ ] Route/perspective dispatch tests: add `sequentialTaskType: "geopolitics"` and `"triage"` cases.
- [ ] e2e: new `tests/sequential-geopolitics-triage.spec.ts` - add `makeMockSequentialGeopoliticsPayload` / `makeMockSequentialTriagePayload` to `tests/helpers/auth-setup.ts` following the `makeMockEvaluativeDealbreakerAiPayload`/`makeMockEvaluativeUncertaintyAiPayload` pattern; cover full flow for both variants including state-preservation (Back/Continue) parity with `tests/state-preservation.spec.ts`.

## 4. Acceptance criteria
- [ ] Sequential reaches parity with the other four generative-payload modes: has a domain-aware geopolitics variant, reachable via `isGeopoliticsAnalyticalDomain()`, with its own step labels and perspective plumbing.
- [ ] Triage variant introduces genuine severity-weighted scoring, not just a copy/relabel of the base variant.
- [ ] `sequentialTaskType` is read from the request body end-to-end (currently not read at all - this alone fixes a real, verifiable gap).
- [ ] `npx vitest run`, `npx playwright test tests/sequential-*.spec.ts`, and `tsc --noEmit` all pass.
- [ ] `root_cause` combo preset (which embeds base `sequentialExerciseSchema`) keeps working unmodified - Phase 6 decides whether/how combo opts into the new variants.
