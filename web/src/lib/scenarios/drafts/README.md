# drafts/

AI-drafted scenarios land here via `npm run scenarios:author`. Files in this directory are
**not imported anywhere in the app** - a scenario here is invisible to learners.

Each numeric draft `dr-<id>.ts` ships with a companion `dr-<id>.verify.test.ts` Monte Carlo
verifier stub that a human must fill in and get passing.

The only way a draft reaches learners is `npm run scenarios:promote -- <id> --confirm`, which
requires:
1. `dr-<id>.verify.test.ts` exists, has no unfilled `NOT_IMPLEMENTED` sentinel, and passes.
2. `auditScenarioDraft` (src/lib/scenarios/audit-draft.ts) passes.
3. A human runs the script with `--confirm` naming this exact draft id.

On success, the script appends the scenario to `../promoted/index.ts`, which IS imported by
`../index.ts` (the live registry). Never import this `drafts/` directory directly.
