/**
 * lib/subscriptions.js
 *
 * Subscription plan management for Monthly Recurring Revenue (MRR).
 * Uses PayPal Subscriptions API for recurring billing.
 * On each billing cycle, credits are auto-refreshed and tier is updated.
 */

import { getIntegrationConfig } from "@/lib/integrations";
import { addCredits } from "@/lib/storage";
import postgres from "postgres";

// ─── Plan Definitions ────────────────────────────────────────────────────────

export const PLANS = [
  {
    id: "hobby",
    name: "Hobby",
    price: 15.00,
    interval: "month",
    credits: 200,
    tier: "starter",
    features: ["200 credits/month", "Standard queue", "Email support"],
    popular: false
  },
  {
    id: "professional",
    name: "Professional",
    price: 49.00,
    interval: "month",
    credits: 800,
    tier: "pro",
    features: ["800 credits/month", "Priority queue", "GitHub/Jira tools", "API access"],
    popular: true
  },
  {
    id: "agency",
    name: "Agency",
    price: 199.00,
    interval: "month",
    credits: 4000,
    tier: "enterprise",
    features: ["4,000 credits/month", "Priority queue", "All integrations", "Custom model overrides", "Dedicated support"],
    popular: false
  }
];

export function getPlanById(planId) {
  return PLANS.find(p => p.id === planId) || null;
}

// ─── Database ────────────────────────────────────────────────────────────────

let sqlClient;
let schemaReady = false;

function getClient() {
  const db = getIntegrationConfig("postgres");
  if (!db.configured) return null;
  if (!sqlClient) {
    sqlClient = postgres(db.secretValue, {
      ssl: process.env.DATABASE_SSL !== "disable" ? "require" : false,
      max: 2
    });
  }
  return sqlClient;
}

async function ensureSchema() {
  const sql = getClient();
  if (!sql || schemaReady) return sql;

  await sql`
    create table if not exists subscriptions (
      id text primary key default gen_random_uuid()::text,
      clerk_user_id text not null,
      plan_id text not null,
      paypal_subscription_id text unique,
      status text not null default 'pending',
      current_period_start timestamptz,
      current_period_end timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists idx_subscriptions_user
    on subscriptions (clerk_user_id) where status = 'active'
  `;
  schemaReady = true;
  return sql;
}

// ─── PayPal Auth ─────────────────────────────────────────────────────────────

async function getPayPalAccessToken() {
  const authString = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");

  const res = await fetch(`${process.env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await res.json();
  return data.access_token;
}

// ─── PayPal Subscription Plans ───────────────────────────────────────────────

export async function createPayPalSubscription(clerkUserId, planId) {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const accessToken = await getPayPalAccessToken();

  // Create a PayPal subscription directly using inline plan definition
  const res = await fetch(`${process.env.PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      plan_id: process.env[`PAYPAL_PLAN_ID_${planId.toUpperCase()}`] || undefined,
      // If no pre-created plan, use inline plan
      ...(process.env[`PAYPAL_PLAN_ID_${planId.toUpperCase()}`] ? {} : {
        plan: {
          product_id: process.env.PAYPAL_PRODUCT_ID || "golden-triad-compute",
          billing_cycles: [{
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: { value: String(plan.price), currency_code: "USD" }
            }
          }],
          payment_preferences: {
            auto_bill_outstanding: true,
            payment_failure_threshold: 2
          }
        }
      }),
      custom_id: clerkUserId,
      application_context: {
        brand_name: "Golden Triad Agentic System",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?subscription=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?subscription=cancelled`
      }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[Subscriptions] PayPal error:", JSON.stringify(data));
    throw new Error(data.message || "Failed to create subscription");
  }

  // Store pending subscription
  const sql = await ensureSchema();
  if (sql) {
    await sql`
      insert into subscriptions (clerk_user_id, plan_id, paypal_subscription_id, status)
      values (${clerkUserId}, ${planId}, ${data.id}, 'pending')
    `;
  }

  const approvalLink = data.links?.find(l => l.rel === "approve")?.href;
  return { subscriptionId: data.id, approvalUrl: approvalLink };
}

// ─── Subscription Lifecycle ──────────────────────────────────────────────────

export async function activateSubscription(paypalSubscriptionId) {
  const sql = await ensureSchema();
  if (!sql) return;

  const [sub] = await sql`
    select id, clerk_user_id, plan_id from subscriptions
    where paypal_subscription_id = ${paypalSubscriptionId} and status != 'active'
  `;

  if (!sub) return; // Already active or not found

  const plan = getPlanById(sub.plan_id);
  if (!plan) return;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Update subscription status
  await sql`
    update subscriptions
    set status = 'active',
        current_period_start = ${now.toISOString()},
        current_period_end = ${periodEnd.toISOString()},
        updated_at = now()
    where id = ${sub.id}
  `;

  // Grant credits and upgrade tier
  await addCredits(sub.clerk_user_id, plan.credits, plan.tier);
}

export async function handleSubscriptionPayment(paypalSubscriptionId) {
  // Called on each billing cycle payment
  const sql = await ensureSchema();
  if (!sql) return;

  const [sub] = await sql`
    select id, clerk_user_id, plan_id from subscriptions
    where paypal_subscription_id = ${paypalSubscriptionId} and status = 'active'
  `;

  if (!sub) return;

  const plan = getPlanById(sub.plan_id);
  if (!plan) return;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Refresh period and grant monthly credits
  await sql`
    update subscriptions
    set current_period_start = ${now.toISOString()},
        current_period_end = ${periodEnd.toISOString()},
        updated_at = now()
    where id = ${sub.id}
  `;

  await addCredits(sub.clerk_user_id, plan.credits, plan.tier);
}

export async function cancelSubscription(clerkUserId) {
  const sql = await ensureSchema();
  if (!sql) throw new Error("Database not available");

  const [sub] = await sql`
    select id, paypal_subscription_id from subscriptions
    where clerk_user_id = ${clerkUserId} and status = 'active'
    limit 1
  `;

  if (!sub) throw new Error("No active subscription found");

  // Cancel with PayPal
  if (sub.paypal_subscription_id) {
    try {
      const accessToken = await getPayPalAccessToken();
      await fetch(`${process.env.PAYPAL_API_BASE}/v1/billing/subscriptions/${sub.paypal_subscription_id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: "User requested cancellation" })
      });
    } catch (e) {
      console.error("[Subscriptions] PayPal cancel error:", e.message);
    }
  }

  await sql`
    update subscriptions
    set status = 'cancelled', updated_at = now()
    where id = ${sub.id}
  `;

  return true;
}

export async function getActiveSubscription(clerkUserId) {
  const sql = await ensureSchema();
  if (!sql) return null;

  const [sub] = await sql`
    select id, plan_id, status, current_period_start, current_period_end, created_at
    from subscriptions
    where clerk_user_id = ${clerkUserId} and status = 'active'
    order by created_at desc
    limit 1
  `;

  if (!sub) return null;

  const plan = getPlanById(sub.plan_id);
  return {
    id: sub.id,
    planId: sub.plan_id,
    planName: plan?.name || sub.plan_id,
    status: sub.status,
    periodStart: sub.current_period_start,
    periodEnd: sub.current_period_end,
    credits: plan?.credits || 0,
    price: plan?.price || 0
  };
}
