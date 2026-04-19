/**
 * lib/admin.js
 * Server-side analytics queries for the Admin Dashboard.
 * All queries operate on the Postgres ledger — returns empty/fallback for local-json mode.
 */

import { getIntegrationConfig } from "@/lib/integrations";
import postgres from "postgres";

let adminClient;

export function isAdmin(userId) {
  if (!userId) return false;
  const admins = (process.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  return admins.includes(userId);
}

function getAdminClient() {

  const db = getIntegrationConfig("postgres");
  if (!db.configured) return null;
  if (!adminClient) {
    adminClient = postgres(db.secretValue, {
      ssl: process.env.DATABASE_SSL !== "disable" ? "require" : false,
      max: 2
    });
  }
  return adminClient;
}

// ─── Overview KPIs ───────────────────────────────────────────────────────────

export async function getOverviewStats() {
  const sql = getAdminClient();
  if (!sql) return fallbackStats();

  try {
    const [runStats] = await sql`
      select
        count(*)::int as total_runs,
        count(*) filter (where created_at > now() - interval '24 hours')::int as runs_24h,
        count(*) filter (where created_at > now() - interval '7 days')::int as runs_7d
      from studio_runs
    `;

    const [userStats] = await sql`
      select
        count(*)::int as total_users,
        sum(compute_credits)::int as total_credits_held,
        count(*) filter (where subscription_tier != 'free')::int as paid_users
      from user_balances
    `;

    const [revenueEstimate] = await sql`
      select
        coalesce(sum(compute_credits), 0)::int as credits_outstanding
      from user_balances
    `;

    // Runs per day for sparkline (last 14 days)
    const dailyRuns = await sql`
      select
        date_trunc('day', created_at)::date as day,
        count(*)::int as runs
      from studio_runs
      where created_at > now() - interval '14 days'
      group by 1
      order by 1
    `;

    return {
      totalRuns: runStats.total_runs || 0,
      runs24h: runStats.runs_24h || 0,
      runs7d: runStats.runs_7d || 0,
      totalUsers: userStats.total_users || 0,
      totalCreditsHeld: userStats.total_credits_held || 0,
      paidUsers: userStats.paid_users || 0,
      creditsOutstanding: revenueEstimate.credits_outstanding || 0,
      dailyRuns: dailyRuns.map(r => ({ day: r.day, runs: r.runs }))
    };
  } catch (e) {
    console.error("[Admin] getOverviewStats error:", e.message);
    return fallbackStats();
  }
}

function fallbackStats() {
  return {
    totalRuns: 0, runs24h: 0, runs7d: 0,
    totalUsers: 0, totalCreditsHeld: 0, paidUsers: 0,
    creditsOutstanding: 0, dailyRuns: []
  };
}

// ─── User Management ─────────────────────────────────────────────────────────

export async function listAllUsers({ limit = 50, offset = 0, sortBy = "updated_at", sortDir = "desc" } = {}) {
  const sql = getAdminClient();
  if (!sql) return { users: [], total: 0 };

  try {
    const [countRow] = await sql`select count(*)::int as total from user_balances`;

    // Using a safe whitelist for sort columns to prevent injection
    const validSorts = ["clerk_user_id", "compute_credits", "subscription_tier", "updated_at"];
    const col = validSorts.includes(sortBy) ? sortBy : "updated_at";
    const dir = sortDir === "asc" ? sql`asc` : sql`desc`;

    const users = await sql`
      select clerk_user_id, compute_credits, subscription_tier, updated_at
      from user_balances
      order by ${sql(col)} ${dir}
      limit ${limit}
      offset ${offset}
    `;

    return {
      users: users.map(u => ({
        userId: u.clerk_user_id,
        credits: u.compute_credits,
        tier: u.subscription_tier,
        updatedAt: u.updated_at
      })),
      total: countRow.total
    };
  } catch (e) {
    console.error("[Admin] listAllUsers error:", e.message);
    return { users: [], total: 0 };
  }
}

// ─── Recent Runs ─────────────────────────────────────────────────────────────

export async function getRecentRuns(limit = 20) {
  const sql = getAdminClient();
  if (!sql) return [];

  try {
    const rows = await sql`
      select id, created_at, payload->>'task' as task,
             payload->>'providerMode' as provider_mode,
             payload->'analysis'->>'complexity' as complexity
      from studio_runs
      order by created_at desc
      limit ${limit}
    `;
    return rows.map(r => ({
      id: r.id,
      createdAt: r.created_at,
      task: r.task,
      providerMode: r.provider_mode,
      complexity: r.complexity
    }));
  } catch (e) {
    console.error("[Admin] getRecentRuns error:", e.message);
    return [];
  }
}

// ─── Adjust User Credits (Admin Override) ────────────────────────────────────

export async function adminSetCredits(clerkUserId, newCredits, newTier = null) {
  const sql = getAdminClient();
  if (!sql) throw new Error("Database not available");

  const tierClause = newTier ? sql`subscription_tier = ${newTier},` : sql``;

  await sql`
    insert into user_balances (clerk_user_id, compute_credits, subscription_tier)
    values (${clerkUserId}, ${newCredits}, coalesce(${newTier}, 'free'))
    on conflict (clerk_user_id) do update
    set ${tierClause}
        compute_credits = ${newCredits},
        updated_at = now()
  `;
  return true;
}
