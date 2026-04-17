import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { adminSetCredits } from "@/lib/admin";

export const runtime = "nodejs";

function isAdmin(userId) {
  const admins = (process.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  return admins.includes(userId);
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { targetUserId, credits, tier } = await request.json();

  if (!targetUserId || typeof credits !== "number") {
    return NextResponse.json({ error: "targetUserId and credits are required" }, { status: 400 });
  }

  try {
    await adminSetCredits(targetUserId, credits, tier || null);
    return NextResponse.json({ success: true, targetUserId, credits, tier });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
