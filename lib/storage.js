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
