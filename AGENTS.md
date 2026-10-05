# Agent instructions (cogi)

## Git commits

Follow `.cursor/rules/git-commits.mdc` - loaded automatically in this workspace.

Format: `<type>(<scope>): <summary>`

Git root is this folder (`cogi/`). App code is in `web/`.

Commit only. Do not push unless explicitly asked.

## Handbook (user docs) - keep it in sync

The in-app Handbook (`/handbook`, tab next to Practice / History / Settings) explains every
user-facing feature. Its content lives in `web/src/lib/handbook/content.ts`.

When you add a feature or change how one works (a new exercise type, a level, a tool, a
page), update its Handbook entry **in the same change**:

- Each entry has: what it trains, what you get, how to practise, levels (for exercises),
  and tips. Plain English, short sentences (about IELTS 6), one idea per line.
- New exercise type: add an entry with `exerciseType` set; `content.test.ts` fails until
  you do.
- Removed or renamed feature: remove or rename its entry, and fix any steps that mention it.
- Check the levels text against the level config (`*-levels.ts`) so the two never disagree.

## Writing: no em dash

Never write the em dash `—` (U+2014), and never its escapes `&mdash;`,
`&#8212;` or `\u2014`. This covers everything: code, comments, UI text,
docs, commit messages and AI prompts.

Use a plain hyphen with spaces (` - `), a comma, a colon, or two short
sentences instead.
