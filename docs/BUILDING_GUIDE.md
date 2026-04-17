# Building Guide - How the Golden Triad was Assembled

This guide serves as an educational walkthrough on how to rebuild the Golden Triad Agentic System from scratch. It is structured sequentially, teaching you how to layer the infrastructure correctly.

## Phase 1: Core Framework and Authentication
1. **Next.js Initialization**: Start with a basic Next.js (App Router) project skeleton.
2. **Clerk Auth Integration**:
   - Install `@clerk/nextjs`.
   - Setup `middleware.js` to protect the `/dashboard` route but explicitly ignore `/api/v1` (Public APIs) and `/api/webhooks` (Billing callbacks).
   - Add `<SignInButton>`, `<SignUpButton>`, and `<UserButton>` to the application shell.
3. **Database Foundation**:
   - Provision a PostgreSQL database (e.g., Neon).
   - Use `postgres` (pjs) driver.
   - Build a `lib/storage.js` file to manage initial tables (e.g., `user_balances`). Add functions to grant and deduct credits transactionally.

## Phase 2: The Agentic Core
1. **Providers Integration**:
   - Install `@ai-sdk/anthropic`, `@ai-sdk/openai`, and `@ai-sdk/google`.
   - Establish API key validations (like confirming `process.env.OPENAI_API_KEY` exists).
2. **Orchestrator Logic (`lib/orchestrator.js`)**:
   - Build the `runAgenticTask` wrapper.
   - Implement the `auto` mode that encapsulates API calls in `try/catch` logic to fallback intelligently across providers if one goes down.
3. **Tool Registry**:
   - Use the `tools` capability in Vercel AI SDK to map deterministic Node.js executions into callable LLM functions.

## Phase 3: APIs and External Access
1. **Public API (v1)**:
   - Build `/api/v1/run`.
   - Implement `lib/api-keys.js`. You must hash API keys before saving them to Postgres. Never store plaintext keys. Generate them as `gt_live_[random_crypto_bytes]`.
2. **Rate Limiting (`lib/rate-limit.js`)**:
   - Add Redis. Implement a Sliding Window algorithm.
   - Crucially, integrate the rate limiter in `middleware.js` *before* hitting the Clerk session validator. This prevents brute-force abuse of your authentication APIs.

## Phase 4: Monetization and Financials
1. **PayPal Gateway**:
   - Implement `/api/billing/paypal/create-order` and `capture-order`.
   - The capture order logic securely updates the user's balance in Postgres **only after** success validation.
2. **Subscriptions**:
   - Build `lib/subscriptions.js`. Subscribe users to pre-configured PayPal Billing Plans.
   - Create the `/api/webhooks/paypal` webhook to handle asynchronous recurring `PAYMENT.SALE.COMPLETED` events, silently adding credits per month without the user logging in.
3. **Crypto Checkout**:
   - Set up Coinbase Commerce checkouts using their API. Use raw body signature verification in your webhooks.

## Phase 5: Administration and Observability
1. **Caching**:
   - Implement `@upstash/redis` in `lib/cache.js`. Identify identical jobs (task + parameters) and return saved JSON from Redis rather than wasting LLM tokens.
2. **Usage Analytics**:
   - Create `lib/usage.js`. Log every credit deduction in a `usage_events` table.
   - Create an Admin Dashboard that runs SQL aggregations to calculate daily burn rates and top users.
3. **Notifications**:
   - Wire low-credit checks into the execution path (`lib/notifications.js`).
   - Use a `bell` component in the UI with interval polling to alert users.

## Summary
Building this layer by layer ensures stability. Never implement Monetization before Rate Limiting, and never implement the Public APIs before Authentication boundaries are verified.
