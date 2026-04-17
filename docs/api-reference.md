# API Reference

The Golden Triad Agentic System exposes a public REST API for programmatic access to the agent pipeline.

## Authentication

All API requests require a valid API key passed in the `Authorization` header:

```
Authorization: Bearer gt_live_<your_key>
```

API keys can be generated from the dashboard at `/dashboard/keys`. Keys are shown only once at creation — store them securely. Keys can be revoked at any time.

## Endpoints

### `POST /api/v1/run`

Execute an agentic task through the full Architect → Builder → Reviewer pipeline.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `task` | string | ✅ | The task/prompt to execute |
| `providerMode` | string | — | `"auto"` (default), `"speed"`, or `"power"` |
| `objective` | string | — | `"golden"` (default) |

**Example:**

```bash
curl -X POST https://your-domain.com/api/v1/run \
  -H "Authorization: Bearer gt_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{"task": "Write a Python script to parse CSV files"}'
```

**Response (200):**

```json
{
  "run": {
    "id": "uuid",
    "task": "...",
    "finalAnswer": "...",
    "phases": [...],
    "runtime": { "responseSource": "live" }
  },
  "cache": { "status": "miss" }
}
```

**Error Responses:**

| Status | Meaning |
|---|---|
| `401` | Missing or invalid API key |
| `402` | Insufficient compute credits |
| `400` | Missing required `task` field |
| `500` | Internal execution error |

## Rate Limits & Credits

- Each live execution costs **1 compute credit**.
- Cache hits are **free** (no credit deduction).
- Credits can be purchased at `/dashboard/billing`.
- The credit balance is the same whether accessed via dashboard or API.

## Key Management

- Maximum **5 active keys** per user.
- Keys use the format `gt_live_<32 hex characters>`.
- Keys are hashed with SHA-256 before storage — we never store your raw key.
- Revoked keys cannot be reactivated.
