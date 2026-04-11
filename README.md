# Golden Triad Agentic System

A focused agentic system inspired by your original `agentic_system`, rebuilt around three providers only:

- `GLM` as the primary direct provider
- `Memo` as a direct provider, with `Mimo` env aliases for compatibility
- `OpenRouter` as the fallback lane with cheap, efficient non-GLM/non-Memo models

The system implements your Golden Rule directly in routing:

> best performance + power + speed + accuracy + efficiency at the lowest cost

## What You Get

- a local Next.js app with a clean working UI
- an agent pipeline with three roles: architect, builder, reviewer
- Golden Rule scoring and model ranking visible in the UI
- provider fallback from direct lanes to OpenRouter only when needed
- local JSON persistence for Mac usage
- optional Postgres persistence through `DATABASE_URL` for Railway Postgres, Neon, Supabase, or any compatible Postgres
- optional Redis response caching through `REDIS_URL`
- health visibility for providers, persistence, and cache
- a central integration registry with a safe operator endpoint
- deployment metadata for `Vercel` and `Railway`

## Local Run

```bash
cd /Users/ekf/golden-triad-agentic-system
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Provider Setup

Minimum working setup:

- `OPENROUTER_API_KEY`

Recommended full setup:

- `GLM_API_KEY`
- `MEMO_API_KEY` or `MIMO_API_KEY`
- `OPENROUTER_API_KEY`

Recommended production extras:

- `DATABASE_URL`
- `REDIS_URL`
- `CACHE_TTL_SECONDS`
- `AGENT_RUN_BUDGET_MS`

## Hosting

Recommended production stacks:

1. `Vercel + Railway Postgres + Railway Redis`
2. `Railway + Railway Postgres + Railway Redis`
3. `Vercel + compatible Postgres + compatible Redis`

Cloudflare is still useful here, but for this first working slice I recommend using it as the front door or later as an OpenNext target rather than the primary runtime.

More detail is in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Operations

- `GET /api/health` reports provider, persistence, and cache readiness and returns `503` when the hosted system is not production-ready.
- `GET /api/integrations` exposes safe integration readiness without secrets.
- `POST /api/run` accepts `bypassCache: true` for a fresh run.
- `AGENT_RUN_BUDGET_MS` caps the end-to-end three-phase run budget so Vercel deployments stay inside the function timeout envelope.

## CI/CD

GitHub Actions files are included for:

- CI: `npm ci` + `npm run build` on pushes and pull requests
- CD: deploy to Vercel from `main`
- Dependabot updates for npm and GitHub Actions

Required GitHub secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Integration Workflow

Register new external services in `lib/integrations.js` so env handling and operator readiness stay in one place.
