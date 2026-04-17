import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOverviewStats, listAllUsers, getRecentRuns } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin guard — only allow the platform owner
function isAdmin(userId) {
  const admins = (process.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  return admins.includes(userId);
}

export async function GET(request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "overview";

  try {
    if (view === "overview") {
      const stats = await getOverviewStats();
      return NextResponse.json(stats);
    }

    if (view === "users") {
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const offset = parseInt(searchParams.get("offset") || "0", 10);
      const data = await listAllUsers({ limit, offset });
      return NextResponse.json(data);
    }

    if (view === "runs") {
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const runs = await getRecentRuns(limit);
      return NextResponse.json({ runs });
    }

    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
