import type { Scenario } from "@/lib/types/math-scenario";

/**
 * Scenarios that started as AI drafts under ../drafts/ and were promoted by a human via
 * `npm run scenarios:promote`. This file is the ONLY path from drafts/ into the live
 * registry (see ../index.ts) - scripts/promote-scenario.ts appends to this array, nothing
 * else ever writes to it, and drafts/ is never imported directly by the app.
 */
export const promotedScenarios: Scenario[] = [];
