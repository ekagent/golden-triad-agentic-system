# Architecture Guide: Automated Deployment & Secret Sync

This guide explains how the **Golden Triad Agentic System** handles secrets and deployments using our new centralized synchronization engine.

---

## ── 1. The Secret Lifecycle ───────────────────────────────────────────

We use a "Single Source of Truth" pattern to ensure consistency across Local, Development, Preview, and Production environments.

### Step A: Local Configuration
Your secrets live in [.env.local](file:///Users/ekf/golden-triad-agentic-system/.env.local). When you add or change a secret there:
1. Run the generation script:
   ```bash
   node scripts/generate-secrets-json.mjs
   ```
2. This creates a Git-ignored [secrets.json](file:///Users/ekf/golden-triad-agentic-system/secrets.json) bundle.

### Step B: GitHub Synchronization
To push your local changes to the cloud:
1. Use the [sync-to-github.mjs](file:///Users/ekf/golden-triad-agentic-system/scripts/sync-to-github.mjs) script (or the `gh` CLI).
2. The entire bundle is saved in **GitHub Repository Secrets** as a single key: `SYNC_SECRETS_JSON`.

### Step C: Cloud Propagation
When the **"Sync Secrets"** GitHub Action runs (either automatically on push to `main` or manually):
1. It parses the `SYNC_SECRETS_JSON` bundle.
2. It pushes individual environment variables to **Vercel** (Production, Preview, and Development) and **Railway** (linked service).

---

## ── 2. Deployment Flow ───────────────────────────────────────────────

We have two primary ways to deploy your application:

### Method 1: Push-to-Deploy (Automatic)
Every time you push code to the `main` branch, Vercel automatically starts a new production build.
- **Best for**: Routine code updates.
- **Note**: Ensure you've run the **Sync Secrets** action *first* if you changed sensitive keys.

### Method 2: Deploy Hook (Manual Production Trigger)
You can trigger a fresh build at any time without a code change by using your **Vercel Deploy Hook**.
- **The Hook**: `https://api.vercel.com/v1/integrations/deploy/prj_fyshFAfICOPXD0u36QXNXSTLRTA4/f7yI3ycdbs`
- **How to use**: Simply perform a POST request (e.g., via `curl`).
- **Best for**: Redeploying after a secret change or forcing a cache clear.

---

## ── 3. Maintenance Checklist ────────────────────────────────────────

### Adding a New Variable
1. Add it to [.env.example](file:///Users/ekf/golden-triad-agentic-system/.env.example) (as a placeholder).
2. Add it to [.env.local](file:///Users/ekf/golden-triad-agentic-system/.env.local) (with your real value).
3. Add the **name** of the variable to the `SYNC_KEYS` array in [scripts/secrets-manifest.js](file:///Users/ekf/golden-triad-agentic-system/scripts/secrets-manifest.js).
4. Run `node scripts/generate-secrets-json.mjs`.
5. Run the Sync.

### Troubleshooting Builds
If a build fails on Vercel:
1. Check the [Vercel Dashboard](https://vercel.com) logs.
2. Verify that **Railway** is healthy (the backend DB).
3. Ensure the **Sync Secrets** action completed successfully on GitHub.
