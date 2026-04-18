import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserSettings, updateUserSettings } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getUserSettings(userId);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const cleanSettings = {
      api_keys: body.api_keys || {},
      role_models: body.role_models || {}
    };

    await updateUserSettings(userId, cleanSettings);
    return NextResponse.json({ success: true, settings: cleanSettings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
