# Rate Limiting

The platform enforces tiered rate limits to protect against abuse and ensure fair usage.

## Tiers

| Tier | Routes | Limit | Window | Identifier |
|---|---|---|---|---|
| `api-key` | `/api/v1/*` | 30 req/min | 60s | API key prefix |
| `dashboard` | `/api/run` | 20 req/min | 60s | IP address |
| `webhook` | `/api/webhooks/*` | 100 req/min | 60s | IP address |
| `admin` | `/api/admin/*` | 30 req/min | 60s | IP address |
| `auth` | `/api/keys` | 10 req/min | 60s | IP address |
| `general` | All other `/api/*` | 60 req/min | 60s | IP address |

## Response Headers

Every API response includes standard rate limit headers:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1713372000
```

## 429 Response

When a rate limit is exceeded:

```json
{
  "error": "Too many requests. Please slow down.",
  "retryAfter": 42
}
```

## Backend

- **Redis**: If `REDIS_URL` is configured, rate limits use Redis sorted sets for distributed, multi-instance support (sliding window algorithm).
- **In-memory fallback**: If Redis is unavailable, an in-memory Map with periodic cleanup is used. This works for single-instance deployments.

## Architecture

Rate limiting is enforced in `middleware.js` — it runs **before** any route handler or Clerk authentication. This means:
1. Attackers cannot burn compute by brute-forcing auth endpoints
2. Webhook floods from misconfigured payment services are contained
3. API key users get predictable, documented limits

## Configuration

Rate limits are defined in `lib/rate-limit.js` → `RATE_LIMITS` object. To adjust limits, update the `max` and `windowMs` values for each tier.
