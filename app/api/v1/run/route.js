import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { deductCredits } from "@/lib/storage";
import { runAgenticTask } from "@/lib/orchestrator";
import { saveRun } from "@/lib/storage";
import { getCachedRun, setCachedRun } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildRunWithRuntime(run, extra = {}) {
  return { ...run, runtime: extra };
}

/**
 * POST /api/v1/run
 * 
 * Public API endpoint for programmatic access via API keys.
 * 
 * Headers:
 *   Authorization: Bearer gt_live_<key>
 * 
 * Body:
 *   { "task": "string", "providerMode": "auto|speed|power", "objective": "golden" }
 * 
 * Returns the full agentic run result.
 */
export async function POST(request) {
  // Extract API key from Authorization header
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || !token.startsWith("gt_live_")) {
    return NextResponse.json({
      error: "Missing or invalid API key. Provide a valid key in the Authorization header: Bearer gt_live_<key>"
    }, { status: 401 });
  }

  // Validate key
  const keyData = await validateApiKey(token);
  if (!keyData) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const userId = keyData.userId;

  // Parse body
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const providerMode = typeof body.providerMode === "string" ? body.providerMode : "auto";
  const objective = typeof body.objective === "string" ? body.objective : "golden";

  if (!task) {
    return NextResponse.json({ error: "task is required." }, { status: 400 });
  }

  try {
    // Check cache first (free)
    const cacheLookup = await getCachedRun({ task, providerMode, objective }, { bypass: false });

    if (cacheLookup.hit && cacheLookup.run) {
      return NextResponse.json({
        run: buildRunWithRuntime(cacheLookup.run, { responseSource: "cache" }),
        cache: { status: "hit", key: cacheLookup.key }
      });
    }

    // Deduct credits for live run
    try {
      await deductCredits(userId, 1);
    } catch (e) {
      return NextResponse.json({
        error: e.message || "Insufficient compute credits. Top up at /dashboard/billing."
      }, { status: 402 });
    }

    // Execute
    const liveRun = await runAgenticTask({ task, providerMode, objective });
    const run = buildRunWithRuntime(liveRun, { responseSource: "live" });

    // Persist
    await saveRun(liveRun).catch(() => {});
    await setCachedRun({ task, providerMode, objective }, liveRun).catch(() => {});

    return NextResponse.json({ run, cache: { status: "miss" } });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Execution failed" }, { status: 500 });
  }
}
