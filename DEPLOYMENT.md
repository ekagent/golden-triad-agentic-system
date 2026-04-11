# Deployment

## Best Default: Vercel + Railway Postgres + Railway Redis

Use this when you want the lowest ops overhead.

1. Provision Railway Postgres and copy `DATABASE_URL`.
2. Provision Railway Redis and copy `REDIS_URL`.
3. Import this folder into Vercel.
4. Add these environment variables:
   - `GLM_API_KEY`
   - `MEMO_API_KEY` or `MIMO_API_KEY`
   - `OPENROUTER_API_KEY`
   - `DATABASE_URL`
   - `DATABASE_SSL`
   - `REDIS_URL`
   - `CACHE_ENABLED`
   - `CACHE_TTL_SECONDS`
   - `AGENT_RUN_BUDGET_MS`
   - `OPENROUTER_SITE_URL`
   - `OPENROUTER_SITE_NAME`
5. Deploy.

## Railway Runtime Option: Railway App + Railway Postgres + Railway Redis

Use this when you want more control over process runtime and future background workers.

1. Provision Postgres and Redis in the Railway project.
2. Create a Railway project from this repo/folder.
3. Set the same environment variables.
4. Railway will build and run with `railway.toml`.

## Cloudflare Positioning

This build is optimized first for Node runtimes that map cleanly to Next.js route handlers and optional local filesystem fallback.

Use Cloudflare when:

- you want CDN, WAF, and caching in front of the app
- you later migrate the runtime to OpenNext or a Worker adapter
- you remove reliance on filesystem fallback and use Postgres only

## Persistence Notes

If `DATABASE_URL` is set, the app persists runs in Postgres.

If `DATABASE_URL` is not set, the app stores run history in `data/runs.json`, which is good for local Mac usage and not suitable for stateless serverless deployment.

If hosted local persistence is not writable, the run API now returns an explicit persistence failure instead of silently dropping the run history.

## Cache Notes

If `REDIS_URL` is set and `CACHE_ENABLED` is not `false`, repeated runs are cached by `task + providerMode + objective`.

Set `CACHE_TTL_SECONDS` to control cache lifetime. The UI can bypass cache for one run, and the response includes cache metadata.

`AGENT_RUN_BUDGET_MS` sets the end-to-end time budget for the architect, builder, and reviewer phases. The default is tuned to stay inside the current Vercel function timeout envelope.

## GitHub Actions

Included workflows:

- CI on push and pull request
- Vercel deploy on `main`

Required repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Health Checks

`/api/health` now returns `503` when the hosted system is not production-ready, so Railway can treat missing providers or non-durable hosted persistence as an unhealthy deployment.

## Integration Registry

Add new external APIs in `lib/integrations.js`. `/api/integrations` exposes safe readiness data without secrets.
