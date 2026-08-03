# Phase 6 — Combo: Variant Round-Out Implementation Plan

> **Roadmap context:** Final phase of the **"round out each thinking mode with its own exercise
> variants"** 6-phase roadmap. Distinct from `docs/PHASE1..5_IMPLEMENTATION.md` (older, unrelated
> app-wide MVP milestones) — and distinct from the "Phase 6" comments already in code (e.g.
> `DisagreeButton.tsx: /** Phase 6 */`, `journal.ts`'s "Phase 6.3" affect label, `weekly-review.ts`'s
> "Phase 6" disagreement signals), which belong to that **older** roadmap and are already shipped.
> Do not conflate the two numbering schemes when reading old code comments.
>
> Roadmap status:
> - ✅ Phase 1 — Analytical
> - ✅ Phase 2 — Generative
> - ✅ Phase 3 — Evaluative
> - ⬜/🚧 Phase 4 — Systems (`docs/VARIANTS_PHASE4_SYSTEMS.md`)
> - ⬜/🚧 Phase 5 — Sequential (`docs/VARIANTS_PHASE5_SEQUENTIAL.md`)
> - 🚧 **Phase 6 — Combo (this doc, depends on Phase 4 & 5 landing first)**

**Dependency note:** this phase's highest-value deliverable (§2b, the new `crisis_response` preset)
requires Phase 4's Systems `"geopolitics"` task type and Phase 5's Sequential `"geopolitics"` task
type to exist first. §2a (wiring variants into the *existing* three presets) is independent and can
land before Phase 4/5 if you want incremental value sooner — but it will only be able to opt
existing presets into variants that already exist at implementation time (Analytical `steelman`,
Generative `argue_debate`/`reframing`/`inversion`, Evaluative `scoring`/`dealbreaker`/`uncertainty`
are already shipped and can be wired immediately).

## 1. Current state audit (grounded in code)

Combo is a **meta-mode**: it bundles 2-3 sub-exercises (each reusing another mode's schema/prompt)
behind one AI call and one shared scenario. Since Phase 1-3 landed, none of Combo's three existing
presets have been updated to ever request a non-base variant of their sub-exercises.

| Concern | File | What exists today |
|---|---|---|
| Presets | `src/lib/types/exercise.ts` (`ComboPresetId = "full_analysis" \| "decision_sprint" \| "root_cause"`) | 3 fixed presets, each a fixed mode combination. |
| Bundle schemas | `src/lib/ai/validators/combo-bundle.ts` | `fullAnalysisSchema` = analytical + systems + **`matrixOnly`** evaluative (hard-pinned to `variant: "matrix"` via a `.refine()`); `decisionSprintSchema` = **`matrixOnly`** evaluative + generative (base `generativeExercisePayloadSchema`, no variant pinning shown but prompt only ever asks for the independent/base style); `rootCauseSchema` = sequential (base) + systems (base) + analytical (base, **not** steelman). |
| Prompt | `src/lib/ai/prompts/combo.ts` | `buildComboGenerationPrompt()` hardcodes each preset's `JSON_RULES` to request base shapes only (e.g. "Evaluative matrix must use variant `matrix`", "Generative must include ... independent-style: no draftText, no hints" — i.e. explicitly excludes the debate/reframing/inversion machinery). No domain-based geopolitics branching anywhere in this file. |
| Route dispatch | Combo's route handling (find via `exerciseType === "combo"` in `src/app/api/ai/route.ts`) | Single call path per preset; no `isGeopoliticsAnalyticalDomain()` check. |
| UI | `src/components/exercises/ComboExerciseFlow.tsx` (1179 lines) | `preset` `<Select>` with the 3 existing options (~L756-766+); per-preset conditional branches throughout (`bundle.preset === "full_analysis" | "decision_sprint" | "root_cause"`) drive both fetch shape and rendering. No variant-awareness. |
| Mode catalog | `src/lib/ai/prompts/exercise-mode-catalog.ts` (`EXERCISE_MODE_DESCRIPTIONS`) | Lists `analytical`, `sequential`, `systems`, `evaluative`, `generative` — **`combo` is absent** (used by `recommend-mode.ts`/`topic-suggestions.ts`; decide deliberately whether combo should ever be AI-recommended, see §2c). |
| Perspective plumbing | N/A | Combo doesn't have its own `kind`; each sub-exercise's reflection, if any, would need to reuse that mode's existing `kind` branch in `src/app/api/ai/perspective/route.ts`. Confirm current behavior (does Combo call the perspective route per sub-exercise, or does it skip AI reflection entirely?) before designing further — read `ComboExerciseFlow.tsx`'s reflection-step code first. |

## 2. Design: three deliverables

### 2a. Let existing presets opt into already-shipped variants (no new preset yet)

This is the direct, low-risk fix for "combo never uses the interesting variants." For each existing
preset, decide per sub-exercise whether to auto-detect geopolitics/variant selection the same way a
standalone exercise would:

- `full_analysis` (analytical + systems + evaluative-matrix): auto-detect geopolitics domain once
  via `isGeopoliticsAnalyticalDomain(domain)` and, if true, request the **analytical geopolitics**
  passage style AND the **systems geopolitics dual-perspective** sub-schema (requires Phase 4).
  Evaluative stays pinned to `matrix` (that's a deliberate design constraint already encoded via
  `matrixOnly` — matrix is the only variant that makes sense as the third leg of a 3-mode
  trade-off comparison; do not lift this pin without a strong reason).
- `decision_sprint` (evaluative-matrix + generative): keep evaluative pinned to `matrix`; let
  generative auto-select between `argue_debate`/`reframing`/`inversion` (currently forced to a
  4th, undocumented "independent-style" shape per the `JSON_RULES` comment — reconcile this: either
  formally register "independent" as a 4th `GenerativeVariant` in
  `src/lib/ai/validators/generative.ts`'s `generativeVariantSchema`, or replace it with a real
  variant like `argue_debate`). **Read `generative.ts` and `combo.ts` together before deciding** —
  this is a genuine inconsistency worth resolving as part of this phase, not a design choice to
  make blind.
- `root_cause` (sequential + systems + analytical): auto-detect geopolitics once and, if true,
  request **sequential geopolitics** (requires Phase 5) + **systems geopolitics** (requires Phase 4)
  + **analytical geopolitics**; analytical could also optionally use `steelman` instead of
  `highlight_tag` — decide based on whether "root cause" reads better as steelman (probably not;
  root-cause analysis wants issue-spotting, so keep `highlight_tag` here, but write down the
  reasoning in the PR description so it isn't re-litigated).

### 2b. New preset: `crisis_response` (the roadmap's capstone — exercises every Phase 4/5 addition)

A 3-stage combo purpose-built to chain the *new* variants together on one shared geopolitical
scenario:

1. **Sequential** (Phase 5 `"geopolitics"` variant) — order response steps for Actor A vs Actor B.
2. **Systems** (Phase 4 `"geopolitics"` variant) — map how that same crisis ripples through the
   same actor network (dual perspective, shock event).
3. **Evaluative** (`"uncertainty"` variant, already shipped in Phase 3) — estimate probabilities
   and payoffs for the response options under the same crisis.

```ts
// src/lib/ai/validators/combo-bundle.ts
const sequentialGeoOnly = sequentialGeopoliticsExerciseSchema; // from Phase 5
const systemsGeoOnly = systemsGeopoliticsExerciseSchema;       // already exists (systems.ts)
const uncertaintyOnly = evaluativeExercisePayloadSchema.refine(
  (v): v is Extract<z.infer<typeof evaluativeExercisePayloadSchema>, { variant: "uncertainty" }> =>
    v.variant === "uncertainty",
  { message: "evaluative must be uncertainty variant" },
);

const crisisResponseSchema = z.object({
  preset: z.literal("crisis_response"),
  sharedTitle: z.string().min(1),
  sharedScenario: z.string().min(20),
  perspectiveAName: z.string().min(1),
  perspectiveBName: z.string().min(1),
  sequential: sequentialGeoOnly,
  systems: systemsGeoOnly,
  evaluativeUncertainty: uncertaintyOnly,
});
export type ComboCrisisResponseBundle = z.infer<typeof crisisResponseSchema>;
```

Note `perspectiveAName`/`perspectiveBName` are hoisted to the bundle's shared top level (not
duplicated per sub-schema) so the prompt can enforce the same two actor names across all three
stages — add a bundle-level refinement checking `sequential.perspectiveAName === bundle-level` etc.,
or simplify by stripping the per-sub-schema name fields and threading the shared ones down at parse
time (pick whichever keeps `combo.ts`'s prompt simplest; document the choice).

### 2c. Mode catalog decision

Decide explicitly (don't silently leave it ambiguous) whether `combo` should be added to
`EXERCISE_MODE_DESCRIPTIONS` in `src/lib/ai/prompts/exercise-mode-catalog.ts`. Arguments for: makes
`recommend-mode.ts`/topic-suggestion flows able to surface combo as a recommendation. Arguments
against: combo requires picking a preset, which doesn't fit the single-mode recommendation UX
elsewhere. **Recommendation: leave it out and record the reasoning as a code comment**, since combo
is discoverable via its own entry point in the exercise picker already (confirm this in
`ExercisePicker`/home dashboard components before finalizing).

## 3. File-by-file checklist

### Validators — `src/lib/ai/validators/combo-bundle.ts`
- [ ] Add `crisisResponseSchema`, `ComboCrisisResponseBundle`, add to the `ComboBundle` union.
- [ ] Add `ComboPresetId` value `"crisis_response"` in `src/lib/types/exercise.ts`.
- [ ] Resolve the `decision_sprint` generative "independent-style" inconsistency (§2a) — either register a real 4th `GenerativeVariant` or repoint at an existing one; update `generativeVariantSchema` and every switch/ternary that enumerates `GenerativeVariant` (`route.ts`, `GenerativeExerciseFlow.tsx`) if a new value is added.
- [ ] Add cross-field refinement for shared actor names in `crisis_response` if going the "hoisted top-level" route (§2b).
- [ ] Unit tests in `combo-bundle.test.ts`: valid `crisis_response` payload parses; mismatched actor names across sub-schemas fails; wrong sub-variant (e.g. evaluative `matrix` instead of `uncertainty`) fails, mirroring the existing `matrixOnly` refinement tests.

### Prompts — `src/lib/ai/prompts/combo.ts`
- [ ] Add `crisis_response` branch to `buildComboGenerationPrompt`, with `JSON_RULES`-equivalent instructions for the geopolitics sequential/systems shapes and the uncertainty evaluative shape (reuse language from `buildGeopoliticsSequentialPrompt`/`buildGeopoliticsSystemsPrompt`/`buildEvaluativeUncertaintyPrompt` where possible instead of re-deriving wording).
- [ ] For §2a: add domain-detection branching (`isGeopoliticsAnalyticalDomain`) inside `full_analysis`/`root_cause` prompt builders so the request text changes shape when geopolitical; update `decision_sprint`'s generative section per the §2a decision.
- [ ] Prompt unit tests: `combo.test.ts` — assert new preset's prompt contains required field/actor-name instructions; assert geopolitics branching changes the emitted instructions for `full_analysis`/`root_cause` when domain matches `isGeopoliticsAnalyticalDomain`.

### Route dispatch
- [ ] Locate combo's dispatch branch in `src/app/api/ai/route.ts` (search `"combo"`); add `crisis_response` to whatever preset switch exists; parse with `crisisResponseSchema`; add retry-suffix handling consistent with the sub-mode-specific suffixes (likely concatenating the relevant per-mode suffixes, since a combo failure could be in any sub-schema — inspect existing combo error-handling code before designing this to avoid duplicating logic that may already generalize).

### UI — `src/components/exercises/ComboExerciseFlow.tsx`
- [ ] Add `"crisis_response"` to the preset `<Select>` (~L756-766) and to every `bundle.preset === ...` conditional chain (there are ~15+ call sites per the grep above — enumerate them all with `grep -n "bundle.preset ===" src/components/exercises/ComboExerciseFlow.tsx` before starting, don't rely on this doc's line numbers, they will drift).
- [ ] Add a shared "Actor A / Actor B" naming display once at the top of the crisis_response flow (reuse `SystemsPerspectiveCompare.tsx` styling conventions) since all 3 stages share the same two actors.
- [ ] Reuse `SequenceDrag.tsx` (x2, for A/B ordering), `SystemsFlowCanvas.tsx`, and evaluative uncertainty's `EvaluativeOutcomeInputRow.tsx` components directly inside the combo flow rather than re-implementing — Combo already does this for its existing presets (confirm the pattern by reading how `full_analysis` currently embeds `SystemsFlowCanvas` before wiring the new preset).
- [ ] For §2a: no new UI controls needed if geopolitics is auto-detected (matches how standalone modes behave today) — just confirm the existing sub-mode components already handle geopolitics payload shapes when embedded inside Combo (they should, since they're the same components).

### Mode catalog
- [ ] Make and document the §2c decision; if adding combo, update `EXERCISE_MODE_DESCRIPTIONS` and check `recommend-mode.ts`/`topic-suggestions.ts` consumers for any assumption that every key maps to a single non-preset exercise type.

### Tests
- [ ] Unit: `combo-bundle.test.ts`, `combo.test.ts`.
- [ ] e2e: extend the combo spec (find via `grep -rl "full_analysis" tests/`) with a `crisis_response` flow test using a new `makeMockComboCrisisResponsePayload` mock helper in `tests/helpers/auth-setup.ts`; also add regression coverage that `full_analysis`/`root_cause` still generate correctly when the (new) geopolitics branching in `combo.ts` is exercised with a non-geopolitical domain (i.e. behavior unchanged for the common case).
- [ ] State preservation: extend `tests/state-preservation.spec.ts` (or its combo-specific counterpart, if one exists — check first) to cover `crisis_response`.

## 4. Acceptance criteria
- [ ] All three existing presets keep working byte-for-byte unchanged for non-geopolitical domains (regression safety net).
- [ ] `crisis_response` end-to-end: generate → sequential (A/B ordering) → systems (dual-perspective map + shock) → evaluative uncertainty (EV estimate) → confidence → journal → complete.
- [ ] The `decision_sprint` "independent-style" generative inconsistency (§2a) is resolved and documented, not left as a silent special case.
- [ ] `npx vitest run`, full `npx playwright test`, `tsc --noEmit` all pass.
- [ ] This phase, combined with Phase 4 and Phase 5, closes out the full 6-phase "round out each
      thinking mode with its own exercise variants" roadmap — after this lands, re-run the audit
      queries from all three `VARIANTS_PHASE*.md` docs' "Current state audit" tables to confirm every
      row now shows full parity across modes.
