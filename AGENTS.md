# AGENTS.md - Golden Triad Agentic System

## Commands

```bash
npm run dev      # Start local dev server at http://localhost:3000
npm run build    # Production build
npm run sync-secrets    # Sync secrets to Vercel (requires VERCEL_TOKEN)
```

## Prerequisites

- Node.js 22+
- Copy `.env.example` to `.env.local` and fill in at minimum `OPENROUTER_API_KEY`

## Architecture

- **3-agent pipeline**: architect → builder → reviewer (defined in `lib/orchestrator.js`)
- **Golden Rule**: "best performance + power + speed + accuracy + efficiency at lowest cost" — implemented in `lib/golden-rule.js`
- **Provider lanes**: GLM (primary), Mimo (primary), OpenRouter (fallback only), Minimax, GitHub
- **MCP Server**: Custom MCP server support via `lib/mcp.js` and `MCP_SERVER_URL`
- **Integration registry**: All external providers registered in `lib/integrations.js` — add new providers there

## Key Files

| File | Purpose |
|------|---------|
| `lib/orchestrator.js` | Main agent execution pipeline, budget management |
| `lib/golden-rule.js` | Task analysis, model scoring, lane selection |
| `lib/provider-client.js` | Raw LLM API calls per provider with retry logic |
| `lib/catalog.js` | Model definitions, lane catalog, runtime config |
| `lib/integrations.js` | Central integration registry (add new providers here) |
| `lib/mcp.js` | MCP server connection and tool execution |
| `lib/storage.js` | Postgres persistence via `postgres` driver |
| `lib/cache.js` | Redis caching via `@upstash/redis` |
| `middleware.js` | Clerk auth + rate limiting |

## Environment Variables

Required for local dev:
- `OPENROUTER_API_KEY` (minimum)

Full setup includes: `GLM_API_KEY`, `MIMO_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `MCP_SERVER_URL`

## Testing

Run a single test manually via the UI at `/api/run` endpoint or use the dashboard.

## Gotchas

- Rate limiting runs in `middleware.js` BEFORE Clerk session validation
- API keys hashed in Postgres via `lib/api-keys.js`
- Budget cap via `AGENT_RUN_BUDGET_MS` (default 45000ms) — critical for Vercel function timeouts
- Agent phases run in order: `architect` → `builder` → `reviewer` with weighted time budgets
- Lock coordination via `lib/coordination.js` for parallel safety
- Provider client has retry logic (2 retries with exponential backoff) for transient failures

## Adding New Providers

1. Add env vars to `.env.example`
2. Add config to `lib/integrations.js`
3. Register model in `lib/catalog.js` lane catalog
4. Add runtime to `lib/provider-client.js`

## Adding MCP Server

1. Set `MCP_SERVER_URL` in environment
2. Optionally set `MCP_SERVER_AUTH` for bearer token auth
3. MCP tools are fetched from `${MCP_SERVER_URL}/tools`