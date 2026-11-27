## Git commits

Follow `.cursor/rules/git-commits.mdc`. Git root is `../` - run `git` from `cogi/`, not `web/`. Commit only; do not push unless asked.

## Handbook (user docs) - keep it in sync

The in-app Handbook (`/handbook`, under Guide in the top bar) explains every
user-facing feature. Its content lives in `src/lib/handbook/content.ts`.

When you add a feature or change how one works (a new exercise type, a level, a tool, a
page), update its Handbook entry **in the same change**:

- Each entry has: what it trains, what you get, how to practise, levels (for exercises),
  and tips. Plain English, short sentences (about IELTS 6), one idea per line.
- New exercise type: add an entry with `exerciseType` set; `content.test.ts` fails until
  you do.
- Removed or renamed feature: remove or rename its entry, and fix any steps that mention it.
- Check the levels text against the level config (`*-levels.ts`) so the two never disagree.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
