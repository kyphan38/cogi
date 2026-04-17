# Firestore Readiness (Phase 4.5)

This document tracks Firestore query/index readiness for `cogi/web`.

## 1) Query Inventory

### Current runtime query patterns (no composite index required today)
- `src/lib/db/firestore.ts`
  - `query(userCollectionRef(...))` + `onSnapshot(...)` without `where/orderBy/limit`.
- `src/lib/db/*` modules
  - most filtering and sorting are currently done in memory after full collection reads.
- `src/app/api/ai/{weekly-review,disagree,recall-feedback}/route.ts`
  - server-side idempotency uses direct `doc(path).get()` and `doc(path).set()`.

### Near-future query patterns (composite indexes expected)
- `exercises`
  - future target: `type == ...` + `completedAt` range + `orderBy(completedAt desc)` (+ optional limit).
- `delayedRecallQueue`
  - future target: `status == "pending"` + `dueAt <= now` + `orderBy(dueAt asc)` + `limit(1)`.
- `weaknesses`
  - future target: `status == ...` + `thinkingGroup == ...` + `orderBy(missCount desc)` + `orderBy(lastSeen desc)` + limit.

## 2) Starter Index Config

`firestore.indexes.json` is added at repo root (`cogi/web/firestore.indexes.json`) with starter composite indexes for the near-future high-risk query shapes above.

Apply when needed:

```bash
firebase deploy --only firestore:indexes
```

## 3) Rules Checklist (UID Scope)

`firestore.rules` is added at repo root (`cogi/web/firestore.rules`) and enforces:
- authenticated user required
- `request.auth.uid == uid` on every allowed collection under `users/{uid}/...`
- explicit allowlist of active collections, including Phase 4 server-write collections:
  - `weeklyReviews`
  - `perspectiveDisagreements`
  - `aiArtifacts`

Manual verification checklist:
- authenticated owner can read/write own docs
- authenticated non-owner cannot read/write other users' docs
- unauthenticated access is denied

## 4) Observability for Query/Index Errors

Standardized logging helper:
- `src/lib/db/firestore.ts` -> `logFirestoreQueryError(source, operation, error)`

Usage:
- all major subscription callsites now log through this helper for consistent diagnostics.
- helper emits an explicit index hint when error patterns match missing-index signals (`failed-precondition`, `index` text).

## 5) Troubleshooting: Missing Firestore Index

Common symptoms:
- client console shows `failed-precondition` from Firestore query.
- error often includes a URL to create the exact required index.

Response flow:
1. Open browser console and copy generated Firebase index URL.
2. Create index in Firebase Console (or add equivalent entry into `firestore.indexes.json`).
3. Deploy indexes and wait until status is `Enabled`.
4. Re-run the failing flow.

## 6) Deferred Refactor Backlog (Index-First Rollout)

### Deferred task A: exercises query pushdown
- file: `src/lib/db/exercises.ts`
- move from in-memory filter/sort to Firestore query chains for completed list views.
- ensure matching index exists before shipping.

### Deferred task B: delayed recall query pushdown
- file: `src/lib/db/delayed-recall.ts`
- replace in-memory pending/due scan with indexed Firestore query.

### Deferred task C: weaknesses query pushdown
- file: `src/lib/db/weaknesses.ts`
- replace in-memory ranking with server-side ordered query + limit.

Rollout rule:
- add index first -> deploy index -> switch query code -> verify in staging/production.
