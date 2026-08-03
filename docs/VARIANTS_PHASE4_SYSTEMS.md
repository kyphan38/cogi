# Phase 4 — Systems: Variant Round-Out Implementation Plan

> **Roadmap context:** This is part of the **"round out each thinking mode with its own exercise
> variants"** 6-phase roadmap (one phase per `ThinkingType`). It is a *different* roadmap from the
> older `docs/PHASE1..5_IMPLEMENTATION.md` MVP build-out docs — those numbers describe unrelated
> app-wide milestones (DB, dashboard, weekly review, etc.) and should not be confused with this one.
>
> Roadmap status:
> - ✅ Phase 1 — Analytical (`highlight_tag` + `steelman` variants, geopolitics domain support)
> - ✅ Phase 2 — Generative (`argue_debate` + `reframing` + `inversion` variants, geopolitics domain support)
> - ✅ Phase 3 — Evaluative (`matrix` + `scoring`/`dealbreaker` + `uncertainty` variants, geopolitics domain support)
> - 🚧 **Phase 4 — Systems (this doc)**
> - ⬜ Phase 5 — Sequential (`docs/VARIANTS_PHASE5_SEQUENTIAL.md`)
> - ⬜ Phase 6 — Combo (`docs/VARIANTS_PHASE6_COMBO.md`)

## 1. Current state audit (grounded in code, read before starting)

Systems is the **only** mode besides Evaluative that already has more than one exercise "flavor",
but unlike Evaluative/Generative it exposes **no user-facing task-type selector** — the geopolitics
flavor is chosen purely by silent domain auto-detection, and there is no non-compensatory /
estimation-style second variant analogous to Evaluative's `dealbreaker`/`uncertainty`.

| Concern | File | What exists today |
|---|---|---|
| Base schema | `src/lib/ai/validators/systems.ts` (`systemsExerciseSchema`) | 6 nodes, `intendedConnections`, single `shockEvent`. **No `variant` discriminant field at all** (unlike Evaluative/Generative). |
| Geopolitics schema | `src/lib/ai/validators/systems.ts` (`systemsGeopoliticsExerciseSchema` → `GeopoliticsSystemsExercisePayload`) | Adds `perspectiveAName`, `perspectiveBName`, `intendedConnectionsB`, `shockEventB`. Detected post-hoc via `isGeopoliticsSystemsPayload()`. |
| Domain detection | `src/lib/exercise/geopolitics-domains.ts` → `isGeopoliticsAnalyticalDomain(domain)` | Shared helper reused by every mode's route dispatch (misleading name — it's generic, not analytical-only). |
| Semantics validation | `validateSystemsExerciseSemantics`, `validateGeopoliticsSystemsSemantics` in `systems.ts` | Cycle detection (`hasDirectedCycle`), shock-ref validation, node distance checks. |
| Retry suffix | `GEOPOLITICS_SYSTEMS_RETRY_SUFFIX` (`systems.ts:351`) | Used in `route.ts` on semantic-validation failure. |
| Prompt builders | `src/lib/ai/prompts/systems.ts` | `buildSystemsGenerationPrompt()`, `buildGeopoliticsSystemsPrompt()`. No third builder. |
| Perspective plumbing | `buildSystemsShockPerspectivePrompt` (`src/lib/ai/prompts/systems-shock-perspective.ts`), dispatched at `kind === "systems"` in `src/app/api/ai/perspective/route.ts` (~L319) | Already forwards `perspectiveAName/B`, `intendedConnectionsB`, `shockEventB` when present — **no code change needed here for the base/geopolitics pair**, only for the new variant below. |
| Route dispatch | `src/app/api/ai/route.ts`, `if (exerciseType === "systems")` (~L455) | Picks `buildSystemsGenerationPrompt` vs `buildGeopoliticsSystemsPrompt` purely from `isGeopoliticsAnalyticalDomain(effectiveDomain)` — **no `systemsTaskType` field is read from the request body at all.** |
| Step labels | `src/components/shared/ExerciseShell.tsx` | `SYSTEMS_EXERCISE_STEP_LABELS` (9 steps: Setup, Decompose, Connect, Confidence, Shock, AI reflection, Journal, Action, Done) and `GEOPOLITICS_SYSTEMS_STEP_LABELS` (adds "Perspective swap" before "AI reflection"). |
| UI | `src/components/exercises/SystemsExerciseFlow.tsx`, `SystemsFlowCanvas.tsx`, `SystemsPerspectiveCompare.tsx` | No task-type `<Select>` (unlike `EvaluativeExerciseFlow.tsx`'s `evaluativeTaskType` dropdown or `GenerativeExerciseFlow.tsx`'s `generativeVariant` dropdown). Geopolitics UI (perspective compare) triggers purely off payload shape. |
| Types | `src/lib/types/exercise.ts` | `SystemsNodeSpec`, `SystemsIntendedConnection`, `SystemsShockEvent` re-exported from validator. No `SystemsTaskType`. |

## 2. Design: two deliverables

### 2a. Promote geopolitics to an explicit, user-selectable task type (parity fix)

Add `SystemsTaskType = "auto" | "geopolitics" | "resilience"` (mirrors `EvaluativeTaskType`).
`"auto"` keeps today's silent domain-detection behavior for backward compatibility; `"geopolitics"`
forces the dual-perspective payload regardless of domain text; `"resilience"` is the new variant
below. Add a `<Select>` control in `SystemsExerciseFlow.tsx`'s setup screen identical in spirit to
`EvaluativeExerciseFlow.tsx`'s task-type picker.

### 2b. New variant: **Resilience Audit** (`"resilience"`)

Rationale: every other mode's second/third variant changes the *interaction*, not just the theme —
Evaluative's `dealbreaker` adds a non-compensatory hard-constraint check, `uncertainty` adds an EV
estimation step. Systems currently has no mechanic-level variant, only a reskinned domain. Resilience
Audit adds a genuine new step: **before** the shock is revealed, the user must rank which nodes are
single points of failure; the shock then cascades **two hops** instead of one, and scoring compares
the user's predicted criticality ranking against which nodes actually got hit (directly or
indirectly, weighted by hop distance).

New/changed shape (in `systemsExerciseSchema` family — add as a third discriminated schema,
`systemsResilienceExerciseSchema`, not a bolt-on optional field, so `parseSystemsExerciseJson`
stays a clean union like `parseEvaluativeExerciseJson`):

```ts
// src/lib/ai/validators/systems.ts
export const nodeCriticalityHintSchema = z.object({
  nodeId: nodeIdSchema,
  /** AI's ground-truth ranking, 1 = most critical (single point of failure). */
  criticalityRank: z.number().int().min(1).max(6),
  rationale: z.string(),
});

export const systemsResilienceExerciseSchema = systemsExerciseSchema.extend({
  variantKind: z.literal("resilience"),
  criticalityGroundTruth: z.array(nodeCriticalityHintSchema).length(6),
  /** Second shock, applied only after the first shock's indirect ring; cascades one hop further. */
  secondShockEvent: shockEventSchema,
});
export type SystemsResilienceExercisePayload = z.infer<typeof systemsResilienceExerciseSchema>;
```

Keep `systemsExerciseSchema` and `systemsGeopoliticsExerciseSchema` untouched (no discriminant was
ever added to them — adding `variantKind` only to the new schema avoids a breaking change to
persisted rows; runtime dispatch continues to use `isGeopoliticsSystemsPayload()` +
a new `isResilienceSystemsPayload()` type guard, both checked before falling back to base).

## 3. File-by-file checklist

### Validators — `src/lib/ai/validators/systems.ts`
- [ ] Add `SystemsTaskType = "auto" | "geopolitics" | "resilience"` export (place near top, alongside existing schemas).
- [ ] Add `nodeCriticalityHintSchema`, `systemsResilienceExerciseSchema`, `SystemsResilienceExercisePayload`.
- [ ] Add `isResilienceSystemsPayload(data: unknown): data is SystemsResilienceExercisePayload` type guard (mirror `isGeopoliticsSystemsPayload`).
- [ ] Extend `parseSystemsExerciseJson` to try resilience schema when `variantKind === "resilience"` is present in the raw parsed JSON before falling back to base/geopolitics (mirror the 3-way branch already used in `evaluative.ts`'s `parseEvaluativeExerciseJson`).
- [ ] Add `validateResilienceSystemsSemantics(data)`: criticality ranks 1-6 unique, `secondShockEvent` refs are valid node ids, at least one node appears in both first and second shock's indirect sets (proves genuine cascade), reuse `hasDirectedCycle`/`validateConnectionSet` helpers.
- [ ] Add `EVALUATIVE`-style retry suffix constant `GEOPOLITICS_SYSTEMS_RESILIENCE_RETRY_SUFFIX` (or reuse `GEOPOLITICS_SYSTEMS_RETRY_SUFFIX` naming convention → `SYSTEMS_RESILIENCE_RETRY_SUFFIX`) for use on validation failure.
- [ ] Unit tests in `systems.test.ts`: valid resilience payload parses; missing `criticalityGroundTruth` entry fails; duplicate `criticalityRank` fails; `secondShockEvent` referencing unknown node id fails; cascading-through check fails when second shock's indirect set doesn't overlap first shock's indirect set.

### Prompts — `src/lib/ai/prompts/systems.ts`
- [ ] Add `buildSystemsResilienceGenerationPrompt(input: { domain; userContext?; adaptationAppendix?; customScenario? }): string` — same `formatUserScenarioBlock`/`buildDomainHint` scaffolding as the other two builders. Prompt must instruct the model to: emit `criticalityGroundTruth` for all 6 nodes with unique ranks, emit `secondShockEvent` whose `directlyAffected` set overlaps the first shock's `indirectlyAffected` set (true cascade), and NOT reveal criticality ranking language inside `scenario`/node `description` text (keep it a hidden ground truth, same "don't leak the answer" discipline used in `buildEvaluativeGenerationPrompt`'s hidden criteria rule).
- [ ] Unit tests in `systems.test.ts` (prompt tests live alongside, per existing convention) — assert prompt string contains the required field names/keywords, mirroring the `toContain(...)` assertions used for `buildGeopoliticsSystemsPrompt`.

### Route dispatch — `src/app/api/ai/route.ts`
- [ ] Read `systemsTaskType` from body (mirror `rawEvaluativeTaskType` handling ~L187-189), default `"auto"`.
- [ ] Inside `if (exerciseType === "systems")` (~L455): when `systemsTaskType === "resilience"`, call `buildSystemsResilienceGenerationPrompt` and parse/validate with the resilience path; when `"geopolitics"`, force `buildGeopoliticsSystemsPrompt` regardless of domain text; when `"auto"`, keep existing `isGeopoliticsAnalyticalDomain(effectiveDomain)` behavior.
- [ ] On semantic-validation retry, select the correct suffix constant based on which schema was targeted (mirror the ternary chain already used for evaluative ~L200-260).
- [ ] Update the "AI generated an invalid exercise" catch-all error branch if a resilience-specific message is warranted (optional, follow existing analytical/systems pattern at ~L461).

### Perspective route — `src/app/api/ai/perspective/route.ts`
- [ ] In the `kind === "systems"` branch (~L319), thread through `criticalityGroundTruth`/`secondShockEvent`/`variantKind` when present so `buildSystemsShockPerspectivePrompt` can reference the user's criticality guesses vs. ground truth in its reflection text (mirror how `evaluative-uncertainty`'s branch (~L224) forwards EV inputs).
- [ ] `src/lib/ai/prompts/systems-shock-perspective.ts`: extend `buildSystemsShockPerspectivePrompt` to optionally accept criticality/second-shock context and comment on accuracy of the user's ranking, same tone as existing shock reflection copy.

### Step labels — `src/components/shared/ExerciseShell.tsx`
- [ ] Add `SYSTEMS_RESILIENCE_STEP_LABELS`: `["Setup", "Decompose", "Connect", "Criticality", "Confidence", "Shock", "Cascade", "AI reflection", "Journal", "Action", "Done"]` (two new steps: "Criticality" before Confidence, "Cascade" after the first Shock reveal — reflects the two-hop mechanic).

### UI — `src/components/exercises/SystemsExerciseFlow.tsx` (+ new sub-components as needed)
- [ ] Add `systemsTaskType` `<Select>` in the setup screen (options: "Auto", "Geopolitical (dual perspective)", "Resilience audit"), same placement/pattern as `EvaluativeExerciseFlow.tsx`'s task-type select.
- [ ] Add a "Criticality" step: render the 6 nodes (reuse `SystemsFlowCanvas.tsx` read-only) with a ranking control (drag or numeric input, consistent with `SequenceDrag.tsx`/existing rank UI patterns) before the shock is shown.
- [ ] Add a "Cascade" step after the first shock reveal: show `secondShockEvent`'s ripple and let the user compare their ranking against actual hits (highlight correctness similar to `EvaluativeDealbreakerAlerts.tsx`'s alert styling for pass/fail feedback).
- [ ] Persist `criticalityGroundTruth`/user ranking/`secondShockEvent` fields on the row (extend `SystemsExerciseRow`-equivalent in `src/lib/types/exercise.ts`).
- [ ] Wire `stepLabels` prop to switch between `SYSTEMS_EXERCISE_STEP_LABELS` / `GEOPOLITICS_SYSTEMS_STEP_LABELS` / `SYSTEMS_RESILIENCE_STEP_LABELS` based on the resolved variant, same conditional pattern already used for evaluative/generative flows.

### Types — `src/lib/types/exercise.ts`
- [ ] Export `SystemsTaskType` (re-export from validator, mirror `EvaluativeQuadrant`/`GenerativeStage` re-export pattern at the top of the file).
- [ ] Extend the systems row interface with `variantKind?: "resilience"`, `criticalityGroundTruth?`, `userCriticalityRanking?`, `secondShockEvent?`.

### Tests
- [ ] Unit: `systems.test.ts` (validator), prompt tests in same file per repo convention.
- [ ] `route.test.ts` (or wherever systems route dispatch is covered) — add cases for `systemsTaskType: "resilience"` and `"geopolitics"` forcing.
- [ ] `perspective/route.test.ts` — resilience-aware reflection prompt gets the new fields.
- [ ] e2e: extend `tests/evaluative-dealbreaker-uncertainty.spec.ts`-equivalent pattern → new `tests/systems-resilience.spec.ts` covering: select "Resilience audit" task type → generate → rank criticality → view shock → view cascade → confidence → AI reflection → journal → complete. Follow the mock-payload builder pattern (`makeMockEvaluativeDealbreakerAiPayload`/`makeMockEvaluativeUncertaintyAiPayload` in `tests/helpers/auth-setup.ts`) by adding `makeMockSystemsResiliencePayload`.

## 4. Acceptance criteria
- [ ] `systemsTaskType` is a real, user-visible control (not silent auto-detection only) with `"auto"` preserving current behavior exactly (no regression to existing geopolitics auto-detect e2e coverage).
- [ ] Resilience variant round-trips: generate → validate → persist → resume (state preservation) → complete, same guarantees `tests/state-preservation.spec.ts` already asserts for other modes.
- [ ] `npx vitest run` and targeted `npx playwright test` for the new spec pass; `tsc --noEmit` clean.
- [ ] No change to existing base/geopolitics systems payload shapes (backward compatible with any already-persisted rows).
