# thinking

Product requirements: [ai_plan.txt](ai_plan.txt).

**Phase 0 Next.js app** lives in [`web/`](web/) (keeps this repo root free for `ai_plan.txt`).

```bash
cd web
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev
```

Or from repo root (uses `web/` as the app directory):

```bash
npm run dev
```

Open [http://localhost:3000/dev/ai-smoke](http://localhost:3000/dev/ai-smoke) in development.

Phase 1 execution plan (living doc in repo, **not** `ai_plan.txt`): [web/PHASE1_IMPLEMENTATION.md](web/PHASE1_IMPLEMENTATION.md).
