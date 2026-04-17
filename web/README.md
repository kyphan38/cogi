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
  - server allowlist (middleware/API): `ALLOWED_USER_UID` or `ALLOWED_USER_EMAIL`
- Server enforcement: middleware now protects app routes and `/api/ai/*`; unauthorized page requests redirect to `/login`, unauthorized API requests return `401`.
- Home: [http://localhost:3000](http://localhost:3000) — in development, link to **AI smoke test**.
- Smoke UI: [http://localhost:3000/dev/ai-smoke](http://localhost:3000/dev/ai-smoke) (requires sign-in first).

## Phase 0 gate (IMP-12)

With valid Firebase client/admin envs and `GEMINI_API_KEY` in `.env.local`, sign in in the browser, then click **Generate** five times (vary domain / context). At least **four** responses should return `{ "ok": true, "data": … }` without changing the prompt between runs.

Automated helper (dev server must be running, default `http://127.0.0.1:3000`):

```bash
npm run gate:phase0
```

API check without browser:

```bash
curl -sS -X POST http://localhost:3000/api/ai \
  -H 'Content-Type: application/json' \
  -d '{"domain":"DevOps / SRE"}' | head -c 400
```

Expected unauthenticated result: HTTP `401`.

## Production build

```bash
npm run build
```

## Firestore Index & Rules Rollout

When query patterns are upgraded to `where/orderBy/limit`, deploy index/rules together:

```bash
firebase deploy --only firestore:indexes,firestore:rules
```

If you see `failed-precondition` with index hint URL in browser console, follow the troubleshooting flow in `docs/FIRESTORE_READINESS.md`.
