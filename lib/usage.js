/**
 * lib/usage.js
 *
 * Usage event logging and analytics queries.
 * Records every credit-consuming event for audit trail and analytics.
 */

import { getIntegrationConfig } from "@/lib/integrations";
import postgres from "postgres";

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
    create table if not exists usage_events (
      id bigint generated always as identity primary key,
      clerk_user_id text not null,
      event_type text not null default 'run',
      credits_used integer not null default 1,
      metadata jsonb default '{}',
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists idx_usage_events_user
    on usage_events (clerk_user_id, created_at desc)
  `;
  await sql`
    create index if not exists idx_usage_events_date
    on usage_events (created_at)
  `;
  schemaReady = true;
  return sql;
}

// ─── Event Logging ───────────────────────────────────────────────────────────

export async function logUsageEvent(clerkUserId, eventType = "run", creditsUsed = 1, metadata = {}) {
  const sql = await ensureSchema();
  if (!sql) return; // Silent fail if no DB

  await sql`
    insert into usage_events (clerk_user_id, event_type, credits_used, metadata)
    values (${clerkUserId}, ${eventType}, ${creditsUsed}, ${sql.json(metadata)})
  `.catch(e => console.error("[Usage] Log error:", e.message));
}

// ─── Analytics Queries ───────────────────────────────────────────────────────

export async function getUsageOverview(days = 30) {
  const sql = await ensureSchema();
  if (!sql) return fallbackOverview();

  try {
    const [totals] = await sql`
      select
        count(*)::int as total_events,
        coalesce(sum(credits_used), 0)::int as total_credits,
        count(distinct clerk_user_id)::int as unique_users
      from usage_events
      where created_at > now() - ${days + ' days'}::interval
    `;

    const daily = await sql`
      select
        date_trunc('day', created_at)::date as day,
        count(*)::int as events,
        coalesce(sum(credits_used), 0)::int as credits,
        count(distinct clerk_user_id)::int as users
      from usage_events
      where created_at > now() - ${days + ' days'}::interval
      group by 1
      order by 1
    `;

    const byType = await sql`
      select
        event_type,
        count(*)::int as count,
        coalesce(sum(credits_used), 0)::int as credits
      from usage_events
      where created_at > now() - ${days + ' days'}::interval
      group by 1
      order by credits desc
    `;

    const topUsers = await sql`
      select
        clerk_user_id,
        count(*)::int as events,
        coalesce(sum(credits_used), 0)::int as credits
      from usage_events
      where created_at > now() - ${days + ' days'}::interval
      group by 1
      order by credits desc
      limit 10
    `;

    return {
      period: `${days}d`,
      totalEvents: totals.total_events,
      totalCredits: totals.total_credits,
      uniqueUsers: totals.unique_users,
      daily: daily.map(d => ({ day: d.day, events: d.events, credits: d.credits, users: d.users })),
      byType: byType.map(t => ({ type: t.event_type, count: t.count, credits: t.credits })),
      topUsers: topUsers.map(u => ({ userId: u.clerk_user_id, events: u.events, credits: u.credits }))
    };
  } catch (e) {
    console.error("[Usage] getUsageOverview error:", e.message);
    return fallbackOverview();
  }
}

export async function getUserUsageHistory(clerkUserId, limit = 50) {
  const sql = await ensureSchema();
  if (!sql) return [];

  try {
    const rows = await sql`
      select event_type, credits_used, metadata, created_at
      from usage_events
      where clerk_user_id = ${clerkUserId}
      order by created_at desc
      limit ${limit}
    `;
    return rows.map(r => ({
      type: r.event_type,
      credits: r.credits_used,
      metadata: r.metadata,
      createdAt: r.created_at
    }));
  } catch (e) {
    console.error("[Usage] getUserUsageHistory error:", e.message);
    return [];
  }
}

function fallbackOverview() {
  return {
    period: "30d", totalEvents: 0, totalCredits: 0, uniqueUsers: 0,
    daily: [], byType: [], topUsers: []
  };
}
