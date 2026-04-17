# Thinking app (Phase 0)

Next.js app lives in `web/` (repo root keeps `ai_plan.txt`).

## Docs (trong `web/docs/`)

- **[USER_GUIDE.md](docs/USER_GUIDE.md)** — hướng dẫn dùng app chi tiết cho người mới (từng bài tập, tương tác, Dashboard, History, Settings).
- **[EXPERIENCE_TUNING.md](docs/EXPERIENCE_TUNING.md)** — góc nhìn sản phẩm khi muốn tinh chỉnh trải nghiệm / AI sau này.
- **[MIGRATE_GEMINI_TO_CLAUDE.md](docs/MIGRATE_GEMINI_TO_CLAUDE.md)** — hướng dẫn chuyển provider AI sang Claude và chỗ chỉnh giới hạn độ dài.

## Commands

```bash
cd web
npm install
cp .env.example .env.local   # then set APP_API_SECRET and GEMINI_API_KEY
npm run dev
```

- Sign in: open any app route (e.g. [http://localhost:3000/dashboard](http://localhost:3000/dashboard)) — you are redirected to **`/login`** until you enter `APP_API_SECRET`. The browser stores it in `localStorage` and sends header **`X-App-Api-Secret`** on every AI request.
- Home: [http://localhost:3000](http://localhost:3000) — in development, link to **AI smoke test**.
- Smoke UI: [http://localhost:3000/dev/ai-smoke](http://localhost:3000/dev/ai-smoke) (requires sign-in first).

## Phase 0 gate (IMP-12)

With valid `APP_API_SECRET` and `GEMINI_API_KEY` in `.env.local`, sign in in the browser, then click **Generate** five times (vary domain / context). At least **four** responses should return `{ "ok": true, "data": … }` without changing the prompt between runs.

Automated helper (dev server must be running, default `http://127.0.0.1:3000`). Export the same secret as in `.env.local`:

```bash
export APP_API_SECRET='same-as-env-local'
npm run gate:phase0
```

API check without browser:

```bash
curl -sS -X POST http://localhost:3000/api/ai \
  -H 'Content-Type: application/json' \
  -H "X-App-Api-Secret: ${APP_API_SECRET}" \
  -d '{"domain":"DevOps / SRE"}' | head -c 400
```

## Production build

```bash
npm run build
```
