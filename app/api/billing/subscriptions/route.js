import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createPayPalSubscription, cancelSubscription, getActiveSubscription, PLANS } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Fetch plans list + user's active subscription
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const active = await getActiveSubscription(userId);
    return NextResponse.json({ plans: PLANS, activeSubscription: active });
  } catch (e) {
    return NextResponse.json({ plans: PLANS, activeSubscription: null });
  }
}

// POST: Create a new subscription
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await request.json().catch(() => ({}));
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

  try {
    const result = await createPayPalSubscription(userId, planId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE: Cancel active subscription
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await cancelSubscription(userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
