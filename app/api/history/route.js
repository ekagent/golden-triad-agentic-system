import { NextResponse } from "next/server";
import { listRuns } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const history = await listRuns(20);
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "History storage is unavailable."
      },
      { status: 503 }
    );
  }
}
