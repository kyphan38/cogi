# cogi app (Phase 0)

Next.js app lives in `web/` (repo root keeps `ai_plan.txt`).

## Docs (trong `web/docs/`)

- **[USER_GUIDE.md](docs/USER_GUIDE.md)** — hướng dẫn dùng app chi tiết cho người mới (từng bài tập, tương tác, Dashboard, History, Settings).
- **[EXPERIENCE_TUNING.md](docs/EXPERIENCE_TUNING.md)** — góc nhìn sản phẩm khi muốn tinh chỉnh trải nghiệm / AI sau này.
- **[MIGRATE_GEMINI_TO_CLAUDE.md](docs/MIGRATE_GEMINI_TO_CLAUDE.md)** — hướng dẫn chuyển provider AI sang Claude và chỗ chỉnh giới hạn độ dài.
- **[FIRESTORE_READINESS.md](docs/FIRESTORE_READINESS.md)** — inventory query/index, rules checklist, và runbook xử lý lỗi thiếu index.

## Commands

```bash
cd web
npm install
cp .env.example .env.local   # set Firebase NEXT_PUBLIC_*, Firebase Admin, allowlist, GEMINI_API_KEY
npm run dev
```

- Sign in: open any app route (e.g. [http://localhost:3000/dashboard](http://localhost:3000/dashboard)) — you are redirected to **`/login`** and continue with Google Sign-In.
- Access control:
  - client allowlist: `NEXT_PUBLIC_ALLOWED_USER_UID` or `NEXT_PUBLIC_ALLOWED_EMAIL`
  - server allowlist: `ALLOWED_USER_UID` or `ALLOWED_USER_EMAIL` (checked on **every** `/api/ai/*` handler via `requireAuthenticatedRouteUser`, and on `/api/auth/session`)
- When allowlist envs are set, **Edge `proxy`** ([`src/proxy.ts`](src/proxy.ts); Next.js 16 convention) also requires a valid session cookie or `Authorization: Bearer` for HTML routes (defense in depth; client still uses `FirebaseAuthGate`). API routes return `401`/`403` without a valid token or if the user is not allowlisted.
- Home: [http://localhost:3000](http://localhost:3000) — in development, link to **AI smoke test**.
- Smoke UI: [http://localhost:3000/dev/ai-smoke](http://localhost:3000/dev/ai-smoke) (requires sign-in first).

## Phase 0 gate (IMP-12)

With valid Firebase client/admin envs and `GEMINI_API_KEY` in `.env.local`, sign in in the browser, then click **Generate** five times (vary domain / context). At least **four** responses should return `{ "ok": true, "data": … }` without changing the prompt between runs.

Automated helper (dev server must be running, default `http://127.0.0.1:3000`):

```bash
npm run gate:phase0
```

API check without browser (must send a Firebase **ID token** for an allowlisted user):

```bash
curl -sS -X POST http://localhost:3000/api/ai \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $GATE_ID_TOKEN" \
  -d '{"domain":"DevOps / SRE"}' | head -c 400
```

Expected without `Authorization`: HTTP `401` with `{ "ok": false, "error": "Missing auth token" }` (or similar).

Phase 0 script: set `GATE_ID_TOKEN` the same way — `GATE_ID_TOKEN="..." npm run gate:phase0`.

## Production build

```bash
npm run build
```

## Deploy (Vercel) — AI route duration

Serverless routes under `src/app/api/ai/*` use **`export const maxDuration = 60`** in each route handler (Next.js / Vercel). [`vercel.json`](vercel.json) also sets `functions` for the same glob. Effective ceiling still depends on your **Vercel plan** (e.g. Hobby limits are lower than Pro); if generations time out, upgrade the project tier or reduce model latency.

## Firestore Index & Rules Rollout

When query patterns are upgraded to `where/orderBy/limit`, deploy index/rules together:

```bash
firebase deploy --only firestore:indexes,firestore:rules
```

If you see `failed-precondition` with index hint URL in browser console, follow the troubleshooting flow in `docs/FIRESTORE_READINESS.md`.
