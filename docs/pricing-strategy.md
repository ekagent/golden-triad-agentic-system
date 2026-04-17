# Pricing Strategy & Profit Margin Analysis

## The Economics of Agentic AI
To ensure the Golden Triad Agentic System remains profitable, we must shield the system against runway execution costs. Because agents operate dynamically (looping over Thought-Action-Observation) a single user query might result in 5 API calls to a foundation model.

### Cost Analysis
- **Average Foundation Model Cost (e.g., OpenRouter / Claude / GLM)**: ~$0.005 per API call.
- **Average Agentic Loop**: 4 iterations per task.
- **Total Compute Cost per Task**: ~$0.02.
- **Safe Margin Markup (80% Target)**: 5x markup.

Based on this, **1 Agentic Task Execution = 1 Compute Credit**. We peg the retail value of 1 Compute Credit to **$0.10**. This ensures that even if an agent hallucinates and consumes the maximum iteration loop, your profit margin remains above 60%, and averages 80%.

---

## Monetization Model (MONY-2 Integration)

We are implementing a hybrid monetization approach combining Pay-Per-Use (Micro-transactions) and Monthly Recurring Revenue (MRR).

### 1. Pay-Per-Use (Credit Top-Ups)
Users can inject liquidity directly via PayPal on demand without a subscription commitment.
- **Starter Pack**: $5.00 for 50 Credits.
- **Boost Pack**: $10.00 for 120 Credits (+20 bonus credits).
- **Pro Pack**: $25.00 for 350 Credits (+100 bonus credits).

### 2. Monthly Subscriptions (MRR)
Subscriptions guarantee cash flow and provide users with a monthly credit refresh alongside premium feature flags.
- **Hobby Tier**: $15.00 / month (Includes 200 Credits per month).
- **Professional Tier (Recommended)**: $49.00 / month (Includes 800 Credits + Priority Queue access).
- **Agency Tier**: $199.00 / month (Includes 4000 Credits + Custom Model Overrides).

## System Enforcement
When an agent attempts to execute a task, the `orchestrator` natively connects to the Postgres `user_balances` table. By checking `compute_credits`, we immediately halt requests if the user lacks the capacity for a 5-step loop, prompting them to refill via the secure dashboard billing portal.
