import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: List the authenticated user's API keys
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const keys = await listApiKeys(userId);
    return NextResponse.json({ keys });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Create a new API key
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label } = await request.json().catch(() => ({}));

  try {
    const key = await createApiKey(userId, label || "Default");
    return NextResponse.json(key);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE: Revoke an API key
export async function DELETE(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) return NextResponse.json({ error: "Missing key id" }, { status: 400 });

  try {
    await revokeApiKey(userId, keyId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
