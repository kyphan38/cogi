# Layout E2E (Nordic Mono)

Playwright specs under `tests/ui-ux/` assert bounding boxes, radii, and typography - not colors.

## Run locally

```bash
npm run test:layout
```

Or the full UI-UX project (includes one retry on failure):

```bash
npx playwright test tests/ui-ux/
```

## Fixtures page

Stable targets live at `/dev/layout-fixtures` (progression card, semantic tag picker, text passage). The layout suite navigates there after auth bypass.

## Auth on allowlisted deployments

When `COGI_ALLOWED_EMAILS` (or similar) blocks unauthenticated traffic at the edge, tests set:

1. `window.__E2E_AUTH_BYPASS__` via init script
2. Cookie `cogi_e2e=1` (see `src/proxy.ts`)

Call `bypassFirebaseAuth(page)` before every `page.goto` into the `(main)` layout.

## AI stubs

`stubFirestoreReads` stubs `POST /api/ai`, combo, perspective, and related endpoints so flows do not need a live Gemini key.
