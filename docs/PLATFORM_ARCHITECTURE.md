# Golden Triad Agentic System - Platform Architecture

This document provides a comprehensive technical overview of the Golden Triad Agentic System. It explains how the individual components interact to provide a resilient, tri-provider execution environment, secure monetization, and extensive observability.

## 1. Core Agentic Engine

The Golden Triad is built around the concept of intelligent routing and fallback execution using up to three models/providers. It resolves single points of failure commonly found when depending purely on a single LLM API.

- **The Golden Rule Algorithm**: An orchestrator (`lib/orchestrator.js`) wrapper around Vercel's AI SDK.
- **Provider Modes**:
  - `auto`: Falls back iteratively across providers if one fails.
  - `speed`: Uses the fastest available provider.
  - `power`: Uses the most capable provider (e.g., Claude 3.5 Sonnet / GPT-4o).
- **Objectives**:
  - `golden`: Balanced logic and capability.
  - `surgical`: Precise, exact code execution or tool use.
  - `creative`: High temperature, open-ended generation.

## 2. Platform Infrastructure

The web layer is built on **Next.js (App Router)** deployed to Vercel. 

### 2.1 Authentication & Security
- **Clerk**: Handles all user sign-ups, sign-ins, and session management. We use their middleware (`middleware.js`) to secure Dashboard routes while passing Public API and Webhook routes through to our custom middleware validations.

### 2.2 Database & Storage
- **PostgreSQL**: We use a Postgres instance (e.g., Neon or Vercel Postgres) accessed via `postgres` (pjs).
- **Core Entities**:
  - `user_balances`: Tracks user credit quotas.
  - `runs`: Persists all historical agent executions.
  - `api_keys`: Stores SHA-256 hashed keys.
  - `usage_events`: Analytics logging.
  - `subscriptions`: Active recurring billing.
  - `notifications`: User alerts.

### 2.3 Caching & Performance
- **Redis (Upstash)**: Used via `@upstash/redis` in `lib/cache.js`.
- **Response Caching**: Deterministic agentic runs are cached. If a user runs the exact same task with the same configuration, the system returns the cached response, saving compute credits and API latency.

### 2.4 Rate Limiting
- **Tiered Sliding Window**: Implemented in `lib/rate-limit.js`, this protects endpoints from abuse before requests hit the database or Clerk APIs.
- **Tiers**: API Keys (30/min), Webhooks (100/min), General (60/min), Auth/Gated (10/min).

## 3. Monetization Engine

- **PayPal**: Handles credit pack processing and recurring monthly subscriptions. Webhooks (`/api/webhooks/paypal`) look for `PAYMENT.SALE.COMPLETED` to grant credits automatically.
- **Coinbase Commerce**: Offers crypto checkouts for credit packs. Webhook verifies signatures and credits accounts seamlessly.

## 4. Admin & Observability

- **Analytics Dashboard**: The Admin suite (`/dashboard/admin`) visualizes credit consumption, top users, and active subscriptions. Charts are rendered in pure SVG.
- **In-App Notifications**: Low-credit thresholds (5, 20, 50 credits) trigger persistent notifications via `lib/notifications.js`, appearing in the user's dashboard bell icon.

## 5. Tool Integrations

The system is augmented by an integrations registry (`lib/integrations.js`). Users can securely provide API keys for tools like **GitHub** and **Jira**. The orchestrator injects these tools organically if configured.
