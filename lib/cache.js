import { createHash } from "node:crypto";
import Redis from "ioredis";
import { getIntegrationConfig } from "@/lib/integrations";

let redisClient;
let connectPromise;
let lastRedisError = "";

function getCacheEnabled() {
  return process.env.CACHE_ENABLED !== "false";
}

export function getCacheTtlSeconds() {
  const value = Number(process.env.CACHE_TTL_SECONDS || 900);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 900;
}

function buildCacheClient() {
  const integration = getIntegrationConfig("redis");

  if (!integration.configured || !getCacheEnabled()) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(integration.secretValue, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true
    });

    redisClient.on("error", (error) => {
      lastRedisError = error instanceof Error ? error.message : "Unknown Redis error";
    });
  }

  return redisClient;
}

async function getCacheClient() {
  const client = buildCacheClient();

  if (!client) {
    return null;
  }

  if (client.status === "ready" || client.status === "connect") {
    return client;
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
  connectPromise = null;
  return client;
}

function normalizeTask(task) {
  return task.trim().replace(/\s+/g, " ");
}

export function buildRunCacheKey({ task, providerMode, objective }) {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        task: normalizeTask(task),
        providerMode,
        objective
      })
    )
    .digest("hex");

  return `golden-triad:run:v1:${digest}`;
}

function buildCacheMeta(status, base = {}) {
  return {
    enabled: getCacheEnabled(),
    ttlSeconds: getCacheTtlSeconds(),
    ...base,
    status
  };
}

export async function getCachedRun(input, options = {}) {
  const key = buildRunCacheKey(input);

  if (options.bypass) {
    return buildCacheMeta("bypassed", {
      key,
      bypassed: true,
      hit: false
    });
  }

  try {
    const client = await getCacheClient();

    if (!client) {
      const integration = getIntegrationConfig("redis");
      return buildCacheMeta(getCacheEnabled() ? "not-configured" : "disabled", {
        key,
        hit: false,
        ready: false,
        configured: integration.configured
      });
    }

    const payload = await client.get(key);

    if (!payload) {
      return buildCacheMeta("miss", {
        key,
        hit: false,
        ready: true,
        configured: true
      });
    }

    return buildCacheMeta("hit", {
      key,
      hit: true,
      ready: true,
      configured: true,
      run: JSON.parse(payload)
    });
  } catch (error) {
    return buildCacheMeta("error", {
      key,
      hit: false,
      ready: false,
      configured: true,
      error: error instanceof Error ? error.message : "Unknown Redis cache error"
    });
  }
}

export async function setCachedRun(input, run) {
  const key = buildRunCacheKey(input);

  try {
    const client = await getCacheClient();

    if (!client) {
      const integration = getIntegrationConfig("redis");
      return buildCacheMeta(getCacheEnabled() ? "not-configured" : "disabled", {
        key,
        ready: false,
        configured: integration.configured
      });
    }

    await client.set(key, JSON.stringify(run), "EX", getCacheTtlSeconds());

    return buildCacheMeta("stored", {
      key,
      ready: true,
      configured: true
    });
  } catch (error) {
    return buildCacheMeta("error", {
      key,
      ready: false,
      configured: true,
      error: error instanceof Error ? error.message : "Unknown Redis cache error"
    });
  }
}

export async function getCacheStatus() {
  const integration = getIntegrationConfig("redis");

  if (!getCacheEnabled()) {
    return {
      id: "redis",
      label: "Redis",
      configured: integration.configured,
      ready: false,
      status: "disabled",
      mode: "response cache disabled",
      detail: "Set CACHE_ENABLED=true to use Redis response caching.",
      ttlSeconds: getCacheTtlSeconds()
    };
  }

  if (!integration.configured) {
    return {
      id: "redis",
      label: "Redis",
      configured: false,
      ready: false,
      status: "not-configured",
      mode: "optional response cache",
      detail: "Set REDIS_URL to enable Railway Redis or another compatible Redis service.",
      ttlSeconds: getCacheTtlSeconds()
    };
  }

  try {
    const client = await getCacheClient();
    await client.ping();

    return {
      id: "redis",
      label: "Redis",
      configured: true,
      ready: true,
      status: "ready",
      mode: "response cache",
      detail: `Redis cache reachable. TTL ${getCacheTtlSeconds()}s.`,
      ttlSeconds: getCacheTtlSeconds()
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : lastRedisError || "Redis is configured but not reachable.";

    return {
      id: "redis",
      label: "Redis",
      configured: true,
      ready: false,
      status: "error",
      mode: "response cache",
      detail: message,
      ttlSeconds: getCacheTtlSeconds()
    };
  }
}
