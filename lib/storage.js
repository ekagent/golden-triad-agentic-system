import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { getIntegrationConfig } from "@/lib/integrations";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(process.cwd(), "data", "runs.json");
const LOCAL_LIMIT = 50;

let sqlClient;
let schemaReady = false;

function shouldUseDatabase() {
  return getIntegrationConfig("postgres").configured;
}

function isHostedProduction() {
  return process.env.NODE_ENV === "production";
}

async function getClient() {
  if (!shouldUseDatabase()) {
    return null;
  }

  if (!sqlClient) {
    const database = getIntegrationConfig("postgres");
    const useSsl = process.env.DATABASE_SSL !== "disable";
    sqlClient = postgres(database.secretValue, {
      ssl: useSsl ? "require" : false,
      max: 1
    });
  }

  if (!schemaReady) {
    await sqlClient`
      create table if not exists studio_runs (
        id text primary key,
        created_at timestamptz not null,
        payload jsonb not null
      )
    `;
    await sqlClient`
      create table if not exists user_balances (
        clerk_user_id text primary key,
        compute_credits integer not null default 0,
        subscription_tier text not null default 'free',
        updated_at timestamptz not null default now()
      )
    `;
    await sqlClient`
      create table if not exists user_settings (
        clerk_user_id text primary key,
        api_keys jsonb not null default '{}'::jsonb,
        role_models jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now()
      )
    `;
    schemaReady = true;
  }

  return sqlClient;
}

async function ensureLocalStore() {
  await fs.mkdir(DATA_DIR, {
    recursive: true
  });
}

async function readLocalRuns() {
  try {
    const content = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

const USER_SETTINGS_FILE = path.join(process.cwd(), "data", "user_settings.json");

async function readLocalUserSettings() {
  try {
    const content = await fs.readFile(USER_SETTINGS_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeLocalUserSettings(settingsMap) {
  await ensureLocalStore();
  await fs.writeFile(USER_SETTINGS_FILE, JSON.stringify(settingsMap, null, 2));
}

export async function listRuns(limit = 12) {
  const client = await getClient();

  if (client) {
    const rows = await client`
      select payload
      from studio_runs
      order by created_at desc
      limit ${limit}
    `;
    return rows.map((row) => row.payload);
  }

  const runs = await readLocalRuns();
  return runs
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit);
}

export async function saveRun(run) {
  const client = await getClient();

  if (client) {
    await client`
      insert into studio_runs (id, created_at, payload)
      values (${run.id}, ${run.createdAt}, ${client.json(run)})
      on conflict (id) do update
      set payload = excluded.payload,
          created_at = excluded.created_at
    `;
    return;
  }

  const current = await readLocalRuns();
  const next = [run, ...current.filter((item) => item.id !== run.id)].slice(0, LOCAL_LIMIT);

  try {
    await ensureLocalStore();
    await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2));
  } catch (error) {
    if (
      isHostedProduction() &&
      error instanceof Error &&
      "code" in error &&
      (error.code === "EROFS" || error.code === "EACCES")
    ) {
      throw new Error(
        "Local JSON persistence is not writable in production. Configure DATABASE_URL for Railway Postgres or another hosted Postgres."
      );
    }

    throw error;
  }
}

export async function getPersistenceStatus() {
  if (shouldUseDatabase()) {
    try {
      const client = await getClient();
      await client`select 1`;

      return {
        id: "persistence",
        label: "Persistence",
        configured: true,
        ready: true,
        status: "ready",
        mode: "postgres",
        detail: "Postgres persistence is active."
      };
    } catch (error) {
      return {
        id: "persistence",
        label: "Persistence",
        configured: true,
        ready: false,
        status: "error",
        mode: "postgres",
        detail: error instanceof Error ? error.message : "Postgres persistence is not reachable."
      };
    }
  }

  try {
    await ensureLocalStore();
    await readLocalRuns();

    return {
      id: "persistence",
      label: "Persistence",
      configured: false,
      ready: true,
      status: isHostedProduction() ? "degraded" : "ready",
      mode: "local-json",
      detail: isHostedProduction()
        ? "Local JSON fallback is active. Configure DATABASE_URL for durable hosted history."
        : "Local JSON fallback is active for development."
    };
  } catch (error) {
    return {
      id: "persistence",
      label: "Persistence",
      configured: false,
      ready: false,
      status: "error",
      mode: "local-json",
      detail: error instanceof Error ? error.message : "Local JSON persistence is not ready."
    };
  }
}

export async function getUserBalance(clerkUserId) {
  const client = await getClient();
  if (!client) return { credits: 0, tier: "free" }; // fallback

  const rows = await client`
    select compute_credits, subscription_tier
    from user_balances
    where clerk_user_id = ${clerkUserId}
  `;
  if (rows.length === 0) {
    // Implicit signup bonus or empty state
    return { credits: 0, tier: "free" };
  }
  return { credits: rows[0].compute_credits, tier: rows[0].subscription_tier };
}

export async function deductCredits(clerkUserId, amount) {
  const client = await getClient();
  if (!client) return true; // Fail open if persistence is not used

  const rows = await client`
    update user_balances
    set compute_credits = compute_credits - ${amount},
        updated_at = now()
    where clerk_user_id = ${clerkUserId} and compute_credits >= ${amount}
    returning compute_credits
  `;
  if (rows.length === 0) {
    // Could not update (either not found or insufficient funds)
    const balance = await getUserBalance(clerkUserId);
    if (balance.credits < amount) {
      throw new Error("Insufficient compute credits");
    }
    // If not found, insert default 0 and fail
    await client`
      insert into user_balances (clerk_user_id, compute_credits, subscription_tier)
      values (${clerkUserId}, 0, 'free')
      on conflict (clerk_user_id) do nothing
    `;
    throw new Error("Insufficient compute credits");
  }
  return rows[0].compute_credits;
}

export async function addCredits(clerkUserId, amount, tier = null) {
  const client = await getClient();
  if (!client) return false;

  const tierFragment = tier ? client`subscription_tier = ${tier},` : client``;
  
  await client`
    insert into user_balances (clerk_user_id, compute_credits, subscription_tier)
    values (${clerkUserId}, ${amount}, COALESCE(${tier}, 'free'))
    on conflict (clerk_user_id) do update
    set ${tierFragment}
        compute_credits = user_balances.compute_credits + ${amount},
        updated_at = now()
  `;
  return true;
}

export async function getUserSettings(clerkUserId) {
  const client = await getClient();

  if (client) {
    const rows = await client`
      select api_keys, role_models
      from user_settings
      where clerk_user_id = ${clerkUserId}
    `;
    if (rows.length === 0) {
      return { api_keys: {}, role_models: {} };
    }
    return { api_keys: rows[0].api_keys || {}, role_models: rows[0].role_models || {} };
  }

  const allSettings = await readLocalUserSettings();
  return allSettings[clerkUserId] || { api_keys: {}, role_models: {} };
}

export async function updateUserSettings(clerkUserId, settings) {
  const client = await getClient();

  if (client) {
    await client`
      insert into user_settings (clerk_user_id, api_keys, role_models)
      values (
        ${clerkUserId}, 
        ${client.json(settings.api_keys || {})}, 
        ${client.json(settings.role_models || {})}
      )
      on conflict (clerk_user_id) do update
      set api_keys = excluded.api_keys,
          role_models = excluded.role_models,
          updated_at = now()
    `;
    return;
  }

  const allSettings = await readLocalUserSettings();
  allSettings[clerkUserId] = {
    api_keys: settings.api_keys || {},
    role_models: settings.role_models || {}
  };
  await writeLocalUserSettings(allSettings);
}
