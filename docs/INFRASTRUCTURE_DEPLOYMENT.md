# Infrastructure and Deployment Management

This guide details the procedures required to provision, manage, and deploy the Golden Triad Agentic System. Our philosophy is to keep **GitHub as the single source of truth**. All environment variables and infrastructure configurations should ideally be orchestrated systematically.

## 1. Hosting Environment
We use **Vercel** for hosting the Next.js application. Vercel acts as the execution edge, terminating SSL, performing edge caching, and executing serverless functions.

### Manual Setup
1. Create a project in Vercel and import your GitHub repository.
2. In the Vercel project settings, configure the root directory if appropriate (usually `/`).
3. Set the Framework Preset to **Next.js**.

## 2. Environment Variables & GitHub Secrets

To keep GitHub as the single source of truth, do not configure secrets manually in the Vercel Dashboard. Instead, use a GitHub Actions workflow to synchronize repository secrets or use Vercel's GitHub app integration which pulls directly from linked configs.

### Core Variables Needed

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
`CLERK_SECRET_KEY`

`DATABASE_URL` (Postgres connection string, e.g., Neon Db)
`UPSTASH_REDIS_REST_URL`
`UPSTASH_REDIS_REST_TOKEN`

`OPENAI_API_KEY`
`ANTHROPIC_API_KEY`
`GOOGLE_GENERATIVE_AI_API_KEY`

`PAYPAL_CLIENT_ID`
`PAYPAL_SECRET`
`PAYPAL_WEBHOOK_ID`

`COINBASE_COMMERCE_KEY`
`COINBASE_WEBHOOK_SECRET`

`ADMIN_USER_IDS` (Comma-separated list of Clerk IDs granted admin rights)

### Deploying Secrets
If configuring CI/CD explicitly:
1. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add all the above as Repository Secrets.
3. Configure a GitHub Action (`.github/workflows/deploy.yml`) that uses the Vercel CLI to deploy and injects these secrets during the build phase.

Example Action snippet:
```yaml
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
steps:
  - uses: actions/checkout@v3
  - name: Install Vercel CLI
    run: npm install --global vercel@latest
  - name: Pull Vercel Environment Information
    run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
  - name: Build Project Artifacts
    run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
  - name: Deploy Project Artifacts to Vercel
    run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## 3. Database Migrations
We use a lightweight schema creation approach where queries invoke `IF NOT EXISTS`. However, for a production setup:
1. All changes to the database structure should be encapsulated in SQL rollback/commit blocks or a migration tool like `db-migrate`.
2. Connect directly to your Neon or Vercel Postgres instance to verify table layouts. The `postgres` client logic in `lib/storage.js` handles schema hydration.

## 4. Webhook Registrations
Third-party providers require explicit endpoint registrations.

### PayPal
1. Go to PayPal Developer Dashboard -> **Apps & Credentials**.
2. Add a Webhook for your App.
3. Set the Webhook URL to `https://<YOUR_DOMAIN>/api/webhooks/paypal`.
4. Subscribe to the `PAYMENT.SALE.COMPLETED` and `BILLING.SUBSCRIPTION.ACTIVATED` events.
5. Copy the Webhook ID and save it as `PAYPAL_WEBHOOK_ID` in your GitHub Secrets.

### Coinbase
1. Go to Coinbase Commerce Dashboard -> **Settings** -> **Notifications**.
2. Add Endpoint: `https://<YOUR_DOMAIN>/api/webhooks/crypto`.
3. Copy the Shared Secret into `COINBASE_WEBHOOK_SECRET`.

## 5. Security & Scaling
- **Rate Limits**: The Vercel execution environment proxies standard Node servers. Redis (Upstash) handles distributed locks. Ensure Upstash plan scales with Vercel hits.
- **Agentic Timeouts**: Vercel Serverless Functions default to 15s timeouts on Hobby plans. Upgrade to Pro and set `export const maxDuration = 60;` in `app/api/run/route.js`.
