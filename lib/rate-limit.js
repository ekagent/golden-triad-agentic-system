/**
 * lib/rate-limit.js
 *
 * Sliding-window rate limiter with Redis backend (falls back to in-memory).
 * 
 * Strategy:
 *  - API key endpoints (/api/v1/*): 30 req/min per key
 *  - Dashboard API (/api/run): 20 req/min per user
 *  - Webhooks (/api/webhooks/*): 100 req/min per IP (generous for payment processors)
 *  - General API: 60 req/min per IP
 */

import Redis from "ioredis";
import { getIntegrationConfig } from "@/lib/integrations";

// ─── Configuration ───────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  "api-key":    { windowMs: 60_000, max: 30,  label: "API Key" },
  "dashboard":  { windowMs: 60_000, max: 20,  label: "Dashboard" },
  "webhook":    { windowMs: 60_000, max: 100, label: "Webhook" },
  "general":    { windowMs: 60_000, max: 60,  label: "General" },
  "admin":      { windowMs: 60_000, max: 30,  label: "Admin" },
  "auth":       { windowMs: 60_000, max: 10,  label: "Auth" },
};

// ─── Redis Client (shared with cache.js pattern) ────────────────────────────

let redisClient;

function getRedisClient() {
  const integration = getIntegrationConfig("redis");
  if (!integration.configured) return null;

  if (!redisClient) {
    redisClient = new Redis(integration.secretValue, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true
    });
    redisClient.on("error", () => {}); // Silently fall back to in-memory
  }
  return redisClient;
}

// ─── In-Memory Fallback ─────────────────────────────────────────────────────

const memoryStore = new Map();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanMemoryStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of memoryStore) {
    if (entry.resetAt < now) memoryStore.delete(key);
  }
}

// ─── Core Rate Limit Check ──────────────────────────────────────────────────

/**
 * Check rate limit for a given identifier and tier.
 * 
 * @returns {{ allowed: boolean, remaining: number, limit: number, resetAt: number }}
 */
export async function checkRateLimit(identifier, tier = "general") {
  const config = RATE_LIMITS[tier] || RATE_LIMITS.general;
  const key = `rl:${tier}:${identifier}`;

  // Try Redis first
  try {
    const redis = getRedisClient();
    if (redis && (redis.status === "ready" || redis.status === "connect")) {
      return await redisRateLimit(redis, key, config);
    }
  } catch {
    // Fall through to memory
  }

  return memoryRateLimit(key, config);
}

async function redisRateLimit(redis, key, config) {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Use a sorted set: score = timestamp, member = unique request id
  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, windowStart);        // Remove old entries
  multi.zadd(key, now, `${now}:${Math.random()}`);    // Add this request
  multi.zcard(key);                                    // Count in window
  multi.pexpire(key, config.windowMs);                 // Auto-expire

  const results = await multi.exec();
  const count = results[2][1]; // zcard result

  return {
    allowed: count <= config.max,
    remaining: Math.max(0, config.max - count),
    limit: config.max,
    resetAt: now + config.windowMs
  };
}

function memoryRateLimit(key, config) {
  cleanMemoryStore();
  const now = Date.now();

  let entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    memoryStore.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= config.max,
    remaining: Math.max(0, config.max - entry.count),
    limit: config.max,
    resetAt: entry.resetAt
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getRateLimitHeaders(result) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function classifyRoute(pathname) {
  if (pathname.startsWith("/api/v1/"))          return "api-key";
  if (pathname.startsWith("/api/run"))           return "dashboard";
  if (pathname.startsWith("/api/webhooks/"))      return "webhook";
  if (pathname.startsWith("/api/admin"))          return "admin";
  if (pathname.startsWith("/api/keys"))           return "auth";
  if (pathname.startsWith("/api/billing/"))       return "general";
  return "general";
}

export function extractIdentifier(request) {
  // Try API key from Authorization header
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer gt_live_")) {
    return auth.slice(7, 39); // First 32 chars of key as identifier
  }

  // Try Clerk user from cookie (opaque — use forwarded IP instead for middleware)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  return ip;
}
