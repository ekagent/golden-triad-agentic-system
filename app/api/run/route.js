import { NextResponse } from "next/server";
import { runAgenticTask } from "@/lib/orchestrator";
import { saveRun, deductCredits, getUserBalance, getUserSettings } from "@/lib/storage";
import { getCachedRun, setCachedRun } from "@/lib/cache";
import { auth } from "@clerk/nextjs/server";
import { logUsageEvent } from "@/lib/usage";
import { checkLowCredits } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function buildRunWithRuntime(run, runtime) {
  return {
    ...run,
    runtime: {
      ...(run.runtime || {}),
      ...runtime
    }
  };
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Please authenticate to use the Triad system." }, { status: 401 });
  }

  const body = await request.json();
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const providerMode = typeof body.providerMode === "string" ? body.providerMode : "auto";
  const objective = typeof body.objective === "string" ? body.objective : "golden";
  const bypassCache = body.bypassCache === true;

  if (!task) {
    return NextResponse.json({ error: "Task is required." }, { status: 400 });
  }

  try {
    const cacheLookup = await getCachedRun({
      task,
      providerMode,
      objective
    }, {
      bypass: bypassCache
    });

    if (cacheLookup.hit && cacheLookup.run) {
      const cachedRun = buildRunWithRuntime(cacheLookup.run, {
        responseSource: "cache",
        cache: {
          key: cacheLookup.key,
          status: cacheLookup.status,
          ttlSeconds: cacheLookup.ttlSeconds,
          bypassed: false
        }
      });

      return NextResponse.json({
        run: cachedRun,
        cache: {
          key: cacheLookup.key,
          status: cacheLookup.status,
          ttlSeconds: cacheLookup.ttlSeconds,
          bypassed: false
        }
      });
    }

    const settings = await getUserSettings(userId);
    const userKeys = settings.api_keys || {};
    const cost = Object.keys(userKeys).length > 0 ? 1 : 5;

    const { isAdmin } = await import("@/lib/admin");
    const isSpecialAccess = isAdmin(userId);

    if (!isSpecialAccess) {
      try {
        await deductCredits(userId, cost);
      } catch (e) {
        return NextResponse.json({ error: e.message || `Insufficient compute credits. This action requires ${cost} credits.` }, { status: 402 });
      }
    }


    // Log usage event for analytics
    logUsageEvent(userId, "run", 1, { providerMode, objective, source: "dashboard" }).catch(() => {});

    // Check low-credit thresholds (fire-and-forget)
    getUserBalance(userId).then(b => checkLowCredits(userId, b.credits)).catch(() => {});

    const liveRun = await runAgenticTask({ task, providerMode, objective, userId });
    const run = buildRunWithRuntime(liveRun, {
      responseSource: "live",
      cache: {
        key: cacheLookup.key,
        status: cacheLookup.status,
        ttlSeconds: cacheLookup.ttlSeconds,
        bypassed: bypassCache
      }
    });

    try {
      await saveRun(run);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Persistence failed.";

      return NextResponse.json(
        {
          error: `Run completed, but persistence failed: ${message}`,
          run,
          cache: run.runtime.cache,
          persistence: {
            status: "error",
            detail: message
          }
        },
        { status: 500 }
      );
    }

    const cacheWrite = await setCachedRun(
      {
        task,
        providerMode,
        objective
      },
      run
    );

    const responseRun = buildRunWithRuntime(run, {
      cache: {
        key: cacheWrite.key || run.runtime.cache.key,
        status: cacheWrite.status || run.runtime.cache.status,
        ttlSeconds: cacheWrite.ttlSeconds || run.runtime.cache.ttlSeconds,
        bypassed: bypassCache
      },
      persistence: {
        status: "saved"
      }
    });

    return NextResponse.json({
      run: responseRun,
      cache: responseRun.runtime.cache,
      persistence: responseRun.runtime.persistence
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown agentic system error."
      },
      { status: 500 }
    );
  }
}
