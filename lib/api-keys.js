/**
 * lib/api-keys.js
 * 
 * API Key management for programmatic access.
 * Keys are hashed with SHA-256 before storage — raw keys are only shown once at creation.
 * Format: gt_live_<32 hex chars>
 */

import crypto from "node:crypto";
import { getIntegrationConfig } from "@/lib/integrations";
import postgres from "postgres";

let sqlClient;

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

let schemaReady = false;

async function ensureSchema() {
  const sql = getClient();
  if (!sql || schemaReady) return sql;

  await sql`
    create table if not exists api_keys (
      id text primary key default gen_random_uuid()::text,
      clerk_user_id text not null,
      key_hash text not null unique,
      key_prefix text not null,
      label text not null default 'Default',
      scopes text[] not null default '{"runs"}',
      created_at timestamptz not null default now(),
      last_used_at timestamptz,
      revoked boolean not null default false
    )
  `;
  await sql`
    create index if not exists idx_api_keys_hash on api_keys (key_hash) where revoked = false
  `;

  schemaReady = true;
  return sql;
}

// ─── Key Generation ──────────────────────────────────────────────────────────

function generateRawKey() {
  const random = crypto.randomBytes(16).toString("hex"); // 32 chars
  return `gt_live_${random}`;
}

function hashKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createApiKey(clerkUserId, label = "Default") {
  const sql = await ensureSchema();
  if (!sql) throw new Error("Database not available");

  // Enforce limit: max 5 active keys per user
  const [countRow] = await sql`
    select count(*)::int as count from api_keys
    where clerk_user_id = ${clerkUserId} and revoked = false
  `;
  if (countRow.count >= 5) {
    throw new Error("Maximum of 5 active API keys reached. Revoke an existing key first.");
  }

  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12) + "…";

  const [row] = await sql`
    insert into api_keys (clerk_user_id, key_hash, key_prefix, label)
    values (${clerkUserId}, ${keyHash}, ${keyPrefix}, ${label})
    returning id, key_prefix, label, scopes, created_at
  `;

  return {
    id: row.id,
    rawKey,           // Only returned once — never stored
    keyPrefix: row.key_prefix,
    label: row.label,
    scopes: row.scopes,
    createdAt: row.created_at
  };
}

export async function listApiKeys(clerkUserId) {
  const sql = await ensureSchema();
  if (!sql) return [];

  const rows = await sql`
    select id, key_prefix, label, scopes, created_at, last_used_at, revoked
    from api_keys
    where clerk_user_id = ${clerkUserId}
    order by created_at desc
  `;

  return rows.map(r => ({
    id: r.id,
    keyPrefix: r.key_prefix,
    label: r.label,
    scopes: r.scopes,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    revoked: r.revoked
  }));
}

export async function revokeApiKey(clerkUserId, keyId) {
  const sql = await ensureSchema();
  if (!sql) throw new Error("Database not available");

  const [row] = await sql`
    update api_keys
    set revoked = true
    where id = ${keyId} and clerk_user_id = ${clerkUserId}
    returning id
  `;

  if (!row) throw new Error("Key not found or already revoked");
  return true;
}

// ─── Validation (for incoming API requests) ──────────────────────────────────

export async function validateApiKey(rawKey) {
  if (!rawKey || !rawKey.startsWith("gt_live_")) return null;

  const sql = await ensureSchema();
  if (!sql) return null;

  const keyHash = hashKey(rawKey);

  const [row] = await sql`
    select id, clerk_user_id, scopes
    from api_keys
    where key_hash = ${keyHash} and revoked = false
  `;

  if (!row) return null;

  // Update last_used_at (fire-and-forget)
  sql`update api_keys set last_used_at = now() where id = ${row.id}`.catch(() => {});

  return {
    keyId: row.id,
    userId: row.clerk_user_id,
    scopes: row.scopes
  };
}
