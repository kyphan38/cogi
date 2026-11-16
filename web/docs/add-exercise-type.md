# Add a new exercise type

How the 7 practice types are built, and every place a new one must be added.
Use an existing type as the model: Reframe or Judgment (short flow) or Systems (many steps).

Below, `xyz` / `Xyz` is the new type.

## 1. Types and lists

- `src/lib/types/exercise.ts`: add `"xyz"` to `ThinkingType`, the `XyzExerciseRow` type, add it to the `Exercise` union, and `isXyzExercise()`.
- `src/lib/exercise/levels.ts`: add `"xyz"` to `LevelledExerciseType`.
- `src/lib/types/practiced-topic.ts`: add `"xyz"` to `PracticedTopicArea`.
- `src/lib/exercise/exercise-mode-cards.ts`: the card (title, href `/exercise/xyz`), `PRACTICE_EXERCISE_TYPES`, the label.
- `src/lib/exercise/exercise-domain-catalog.ts`: add `"xyz"` to `bestFor` of the topics it fits.
- `src/lib/topics/topic-ideas.ts` (`AI_TOPIC_MODES`) and `src/lib/ai/prompts/exercise-mode-catalog.ts`: only if AI topic ideas should suggest it.

## 2. Levels, scoring, idea cards (pure, with tests)

- `src/lib/exercise/xyz-levels.ts`: `XYZ_LEVELS` for guided / standard / expert.
- `src/lib/exercise/xyz-score.ts` (+ `.test.ts`): the score shown in the answer key, and a `rateXyz()` for the level suggestion.
- `src/lib/exercise/level-suggestion.ts`: call `rateXyz()` for the new type.
- Idea cards for "Take with you" (`xyz-*-cards.ts`, `xyz-*-guide.ts`, with a test), like `reframe-trap-cards.ts`.

## 3. AI

- `src/lib/ai/validators/xyz.ts` (+ test): zod schema of the generated exercise.
- `src/lib/ai/response-schemas.ts`: `xyzResponseSchema()`.
- `src/lib/ai/prompts/xyz.ts` (generate) and `xyz-perspective.ts` (feedback).
- `src/app/api/ai/route.ts`: the `exerciseType: "xyz"` branch. `src/app/api/ai/perspective/route.ts`: the `kind: "xyz"` branch. Both have route tests.
- Model choice: see the comment at the top of `src/lib/ai/gemini.ts`.

## 4. The flow (UI)

Make the folder `src/components/exercises/xyz/`:

| File | What goes in it |
|---|---|
| `XyzExerciseFlow.tsx` | Picks the step to show. Stays short: no state, no handlers. |
| `useXyzFlow.tsx` | All state, effects and actions. Starts with `useExerciseFlow` (see below). Exports `XyzFlowState`. |
| `steps/*.tsx` | One component per step: `SetupStep`, the work step(s), `FeedbackStep`. Each takes `s: XyzFlowState`. |
| `shared.tsx` | Constants (`FlowStep`, `FEEDBACK_STEP`, part labels) and small helpers or components used by several steps. |

Shared pieces to reuse, in `src/components/exercises/flow/`:

- `useExerciseFlow`: step, level, exercise, error, loading, confidence, feedback, takeaway, resume, `advance`, `finish`. Pass `type`, `resumeId`, `isRow: isXyzExercise` and `onResume` (restore your own state and set the step).
- `useDebouncedSave`: autosave while the user works (pass `null` on the setup and done steps).
- `SetupParts.tsx`: `GenerateButton`, `SuggestedTopics`, `DomainField`, `SourceSelect`, `SetupActions`.
- `LevelSuggestionPrompt`: the "next level" card after Finish.
- Also: `LevelPicker`, `LearnFirst`, `PracticeFinishCard`, `ExerciseShell`.

Type narrowing: when the parent shows a step under `step === 1 && exercise`, pass `exercise={exercise}` to the step with type `NonNullable<XyzFlowState["exercise"]>`. Do not use `!` inside the step.

Then:

- `src/components/exercises/ExerciseFlowHost.tsx`: add `xyz: XyzExerciseFlow` to `FLOW_BY_TYPE`.
- `src/components/exercises/XyzAnswerKey.tsx`: the answer key shown in the feedback step and in History.
- `src/app/(main)/exercise/history/page.tsx`: the type filter option, and showing the answer key.

## 5. Handbook

`src/lib/handbook/content.ts`: an entry with `exerciseType: "xyz"` (what it trains, what you get, how to practise, levels, tips). `content.test.ts` fails until it exists. Check the level text against `xyz-levels.ts`.

## 6. Tests

- Unit tests next to each `lib/` file (`npm run test:unit`).
- `tests/helpers/auth-setup.ts`: a mock for `exerciseType: "xyz"` in `/api/ai` and `kind: "xyz"` in `/api/ai/perspective`.
- `tests/xyz-exercise.spec.ts`: one full run per level (setup, work, feedback, Finish, History).
- `tests/resume-autosave.spec.ts`: one test: edit, wait for the autosave, reload, same step and data.
- `tests/ui-ux/mobile-overflow.spec.ts`: add the new screens.

## Keep files small

A file over about 500 lines is split before a feature is added to it: move a step to `steps/`, a pure function to `lib/` (with a test), or a block of state to its own hook.
