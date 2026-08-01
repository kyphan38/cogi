# Cogi Web - Comprehensive Test Plan

## Current State

- **199 source files** across 14 major layers
- **12 unit test files** (94 tests, all passing) - covers analytics scoring, text matching, adaptive tiers, one AI validator
- **9 Playwright E2E specs** - covers exercise flows, dashboard, decisions, guide, layout
- **Vitest** for unit tests, **Playwright** for E2E
- **0 tests** for: database, API routes, auth, prompt builders, hooks, most validators, perspective formatting, insights, backup/export

---

## Testable Surfaces - Categorized & Prioritized

### Tier 1: Pure Functions (no mocking needed)

These are the quickest wins - pure input/output, zero external dependencies.

| # | Module | File | What to Test | Est. Tests |
|---|--------|------|--------------|------------|
| 1a | Strip undefined | `lib/db/strip-undefined-deep.ts` | Recursive removal of `undefined`, preserve `null`/`Date`/arrays, nested objects | 8 |
| 1b | Generative scaffold | `lib/generative-scaffold.ts` | Stage transitions at boundaries: 0→edit, 3→hint, 7→independent | 5 |
| 1c | Timing-safe equal | `lib/api/timing-safe-equal.ts` | Equal strings, different lengths, empty strings, unicode | 6 |
| 1d | Sanitize real data | `lib/text/sanitizeRealData.ts` | HTML/script tag removal, dangerous attrs, unicode normalization, word count | 10 |
| 1e | Server auth logic | `lib/auth/server-auth.ts` | `hasServerAllowlist`, `isDecodedTokenAllowedUser` with various env combos | 8 |
| 1f | Weekly review payload | `lib/insights/build-weekly-review-payload.ts` | `clip()` char limits, `exerciseSummaryForReview` per type, `journalBlobForReview` truncation, `aiSnippetForReview` | 12 |
| 1g | Perspective formatting | `lib/perspective/format-structured.ts` | Section mapping, clarity block building, markdown output, legacy fallback | 10 |
| 1h | Prompt builders (all 21) | `lib/ai/prompts/*.ts` | String structure, variable interpolation, required sections present, no template placeholders leak | 30 |
| 1i | Validator schemas (7) | `lib/ai/validators/*.ts` | Valid JSON passes, missing fields reject, semantic checks (geopolitics constraints, passage length) | 35 |
| 1j | Dashboard aggregates (extend) | `lib/analytics/dashboard-aggregates.ts` | Edge cases: empty arrays, single item, 100+ domains, malformed dates | 6 |

**Subtotal: ~130 tests**

### Tier 2: Mockable Business Logic (mock Firebase/external deps)

These test core business logic by mocking the database and external service layer.

| # | Module | File | What to Test | Mock Strategy | Est. Tests |
|---|--------|------|--------------|---------------|------------|
| 2a | Exercise DB ops | `lib/db/exercises.ts` | Query filtering (type, domain, date range), subscription setup, `deleteCompletedExerciseAndRelatedRecords` batch | Mock Firestore getDocs/setDoc/writeBatch | 15 |
| 2b | Complete exercise flow | `lib/db/complete-exercise.ts` | Multi-step batch write, confidence record creation, `addHoursIso` (pure), recall queue insertion | Mock writeBatch + getAppSettings | 10 |
| 2c | Backup import/export | `lib/db/backup.ts` | `buildBackupPayload` structure, `exportJournalMarkdown` formatting, `importBackupJson` chunked writes, `commitDeletesInChunks` batch size 400 | Mock Firestore batch | 12 |
| 2d | Performance profile | `lib/adaptive/performance-profile.ts` | Rolling window (10) mean calc, tier assignment, min samples threshold, empty exercise list | Mock listCompletedExercises + getConfidenceRecordForExercise | 8 |
| 2e | Record weaknesses | `lib/adaptive/record-weaknesses.ts` | Routing by exercise type, combo handling, hit/miss recording, settings-gated skip | Mock analytics fns + upsertMiss/recordHit | 10 |
| 2f | Edge auth | `lib/auth/edge-auth.ts` | JWT verification, bearer token extraction, allowlist checks, JWKS failure handling | Mock jose jwtVerify | 8 |
| 2g | Actions DB | `lib/db/actions.ts` | `putAction`, `toggleActionFollowThroughWeek`, `currentIsoWeekKey`, 14-day filter | Mock Firestore | 8 |
| 2h | Delayed recall | `lib/db/delayed-recall.ts` | `getNextDueRecall` ordering, `expireStalePendingRecalls` batch, `updateRecallRow` | Mock Firestore | 8 |
| 2i | Weaknesses DB | `lib/db/weaknesses.ts` | `upsertMiss` counter increment, `recordHit` resolution after 3 hits, `listTopActiveWeaknesses` sort | Mock Firestore | 10 |
| 2j | Settings DB | `lib/db/settings.ts` | Get/set operations, subscription setup, default values when doc missing | Mock Firestore | 6 |

**Subtotal: ~95 tests**

### Tier 3: API Route Handlers (mock auth + AI provider)

Test request validation, auth enforcement, error handling, and retry logic.

| # | Route | File | What to Test | Est. Tests |
|---|-------|------|--------------|------------|
| 3a | Exercise generation | `app/api/ai/route.ts` | Zod body validation (reject bad type), auth required (401), prompt building dispatch by type, Gemini retry on parse failure, error response shape | 12 |
| 3b | Perspective | `app/api/ai/perspective/route.ts` | All perspective kinds (analytical, sequential, systems, evaluative, generative), cache hit path, structured vs plain text modes | 10 |
| 3c | Combo | `app/api/ai/combo/route.ts` | Preset ID validation, multi-phase generation, caching | 6 |
| 3d | Debate | `app/api/ai/debate/route.ts` | Thread continuation, auth check | 4 |
| 3e | Disagree | `app/api/ai/disagree/route.ts` | Disagreement prompt with context | 4 |
| 3f | Weekly review | `app/api/ai/weekly-review/route.ts` | Payload construction, summary generation | 4 |
| 3g | Recall feedback | `app/api/ai/recall-feedback/route.ts` | Recall context injection | 4 |
| 3h | Generative rubric | `app/api/ai/generative-rubric/route.ts` | Rubric evaluation prompt | 4 |
| 3i | Journal ref | `app/api/ai/journal-ref/route.ts` | Journal reference generation | 4 |
| 3j | Session auth | `app/api/auth/session/route.ts` | Cookie validation, token refresh | 4 |

**Subtotal: ~56 tests**

### Tier 4: React Hooks (mock subscriptions)

| # | Hook | File | What to Test | Est. Tests |
|---|------|------|--------------|------------|
| 4a | useExercise | `lib/hooks/useExercise.ts` | State transitions, loading states, error handling | 6 |
| 4b | useAnalytics | `lib/hooks/useAnalytics.ts` | Data aggregation from subscriptions | 5 |
| 4c | useJournal | `lib/hooks/useJournal.ts` | Entry subscription, write operations | 5 |
| 4d | useGenerativeStage | `lib/hooks/useGenerativeStage.ts` | Stage derivation from completed count | 4 |

**Subtotal: ~20 tests** (requires `@testing-library/react` - not currently installed)

### Tier 5: E2E Flows (Playwright - extend existing)

| # | Flow | Gap | Est. Tests |
|---|------|-----|------------|
| 5a | Auth | Login, allowlist rejection, session expiry, redirect after login | 5 |
| 5b | Exercise completion | Full submit → confidence → perspective → journal cycle | 5 |
| 5c | Delayed recall | Recall notification → answer → feedback | 3 |
| 5d | Backup/export | Export JSON, import JSON, export journal markdown | 3 |
| 5e | Settings | Toggle adaptive difficulty, set user context, delayed recall toggle | 3 |
| 5f | Weekly review | Trigger review generation, view history | 2 |
| 5g | Error states | Network failure, AI timeout, invalid response recovery | 4 |

**Subtotal: ~25 tests**

---

## Priority Matrix

```
                        HIGH IMPACT
                            │
          Tier 2a-2c        │        Tier 1h-1i
         (DB operations)    │     (Prompts + Validators)
                            │
   LOW EFFORT ──────────────┼──────────────── HIGH EFFORT
                            │
          Tier 1a-1g        │        Tier 3a-3j
       (Pure functions)     │      (API routes)
                            │
                        LOW IMPACT
```

**Recommended execution order:**

1. **Tier 1a-1g** - Pure functions. Zero setup, immediate coverage. ~63 tests in one session.
2. **Tier 1h-1i** - Prompt builders + validators. High value (AI correctness), pure logic. ~65 tests.
3. **Tier 2a-2c** - Database layer. Highest risk code, needs Firestore mock pattern established first. ~37 tests.
4. **Tier 2d-2j** - Remaining mockable modules. Builds on mock pattern from 2a-2c. ~58 tests.
5. **Tier 3** - API routes. Full request/response cycle testing. ~56 tests.
6. **Tier 4** - Hooks. Requires adding `@testing-library/react`. ~20 tests.
7. **Tier 5** - E2E gaps. Extends existing Playwright suite. ~25 tests.

---

## Setup Requirements

### Already in place
- `vitest ^4.1.7` configured with `@` alias
- `playwright ^1.60.0` with auth helpers
- Test pattern: `src/**/*.test.ts`

### Needed for Tier 2+
- **Firestore mock helper** - shared `createMockFirestore()` factory for consistent mocking across DB tests
- `vi.mock('firebase/firestore')` pattern for unit tests
- Shared test fixtures for exercise types (analytical, sequential, systems, evaluative, generative)

### Needed for Tier 3
- **Route test helper** - wraps `POST` handler with mock `NextRequest`, mock auth, stubbed Gemini
- Shared response assertions (`expectOk`, `expectError`)

### Needed for Tier 4
- `npm install -D @testing-library/react @testing-library/jest-dom` 
- Update `vitest.config.ts` with `environment: 'jsdom'` for hook tests

---

## Test File Naming Convention

Follow existing pattern: colocated with source, `.test.ts` suffix.

```
src/lib/db/strip-undefined-deep.test.ts        (Tier 1a)
src/lib/generative-scaffold.test.ts             (Tier 1b)
src/lib/api/timing-safe-equal.test.ts           (Tier 1c)
src/lib/text/sanitizeRealData.test.ts           (Tier 1d)
src/lib/auth/server-auth.test.ts                (Tier 1e)
src/lib/insights/build-weekly-review-payload.test.ts  (Tier 1f)
src/lib/perspective/format-structured.test.ts   (Tier 1g)
src/lib/ai/prompts/analytical.test.ts           (Tier 1h - one per prompt file)
src/lib/ai/validators/common.test.ts            (Tier 1i - one per validator)
src/lib/db/exercises.test.ts                    (Tier 2a)
...
```

---

## Coverage Target

| Phase | Tests Added | Cumulative | Timeline |
|-------|------------|------------|----------|
| Tier 1a-1g (pure) | ~63 | 157 | Session 1 |
| Tier 1h-1i (prompts/validators) | ~65 | 222 | Session 2 |
| Tier 2a-2c (DB core) | ~37 | 259 | Session 3 |
| Tier 2d-2j (DB + adaptive) | ~58 | 317 | Session 4 |
| Tier 3 (API routes) | ~56 | 373 | Session 5 |
| Tier 4 (hooks) | ~20 | 393 | Session 6 |
| Tier 5 (E2E gaps) | ~25 | 418 | Session 7 |

**From 94 → ~418 tests across 7 sessions.**
