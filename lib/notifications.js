/**
 * lib/notifications.js
 *
 * In-app notification system with Postgres persistence.
 * Supports: low-credit alerts, subscription reminders, system announcements.
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
    create table if not exists notifications (
      id bigint generated always as identity primary key,
      clerk_user_id text not null,
      type text not null,
      title text not null,
      message text not null,
      action_url text,
      read boolean not null default false,
      dismissed boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists idx_notifications_user
    on notifications (clerk_user_id, dismissed, created_at desc)
  `;
  schemaReady = true;
  return sql;
}

// ─── Notification Types ──────────────────────────────────────────────────────

const LOW_CREDIT_THRESHOLDS = [
  { threshold: 5,  title: "Credits critically low", message: "You have {credits} credits left. Top up now to avoid service interruption." },
  { threshold: 20, title: "Credits running low",    message: "You have {credits} credits remaining. Consider topping up soon." },
  { threshold: 50, title: "Credit balance notice",  message: "Your balance is at {credits} credits. Plan ahead to stay uninterrupted." },
];

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createNotification(clerkUserId, type, title, message, actionUrl = null) {
  const sql = await ensureSchema();
  if (!sql) return null;

  // Deduplicate: don't create same type within last hour
  const [existing] = await sql`
    select id from notifications
    where clerk_user_id = ${clerkUserId}
      and type = ${type}
      and created_at > now() - interval '1 hour'
      and dismissed = false
    limit 1
  `;
  if (existing) return null;

  const [row] = await sql`
    insert into notifications (clerk_user_id, type, title, message, action_url)
    values (${clerkUserId}, ${type}, ${title}, ${message}, ${actionUrl})
    returning id
  `;
  return row?.id || null;
}

// ─── Low Credit Check (called after deductCredits) ──────────────────────────

export async function checkLowCredits(clerkUserId, currentBalance) {
  for (const { threshold, title, message } of LOW_CREDIT_THRESHOLDS) {
    if (currentBalance <= threshold) {
      await createNotification(
        clerkUserId,
        `low_credits_${threshold}`,
        title,
        message.replace("{credits}", String(currentBalance)),
        "/dashboard/billing"
      );
      return; // Only fire the most urgent one
    }
  }
}

// ─── Subscription Reminders ─────────────────────────────────────────────────

export async function createSubscriptionReminder(clerkUserId, planName, daysLeft) {
  await createNotification(
    clerkUserId,
    "subscription_renewal",
    "Subscription renewing soon",
    `Your ${planName} plan renews in ${daysLeft} days. Credits will be refreshed automatically.`,
    "/dashboard/billing"
  );
}

// ─── Read Operations ─────────────────────────────────────────────────────────

export async function getUserNotifications(clerkUserId, limit = 20) {
  const sql = await ensureSchema();
  if (!sql) return [];

  const rows = await sql`
    select id, type, title, message, action_url, read, created_at
    from notifications
    where clerk_user_id = ${clerkUserId} and dismissed = false
    order by created_at desc
    limit ${limit}
  `;

  return rows.map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    actionUrl: r.action_url,
    read: r.read,
    createdAt: r.created_at
  }));
}

export async function getUnreadCount(clerkUserId) {
  const sql = await ensureSchema();
  if (!sql) return 0;

  const [row] = await sql`
    select count(*)::int as count
    from notifications
    where clerk_user_id = ${clerkUserId} and read = false and dismissed = false
  `;
  return row?.count || 0;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function markAsRead(clerkUserId, notificationId) {
  const sql = await ensureSchema();
  if (!sql) return;
  await sql`
    update notifications set read = true
    where id = ${notificationId} and clerk_user_id = ${clerkUserId}
  `;
}

export async function markAllRead(clerkUserId) {
  const sql = await ensureSchema();
  if (!sql) return;
  await sql`
    update notifications set read = true
    where clerk_user_id = ${clerkUserId} and read = false
  `;
}

export async function dismissNotification(clerkUserId, notificationId) {
  const sql = await ensureSchema();
  if (!sql) return;
  await sql`
    update notifications set dismissed = true
    where id = ${notificationId} and clerk_user_id = ${clerkUserId}
  `;
}
