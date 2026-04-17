import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkGitHubConnection, checkJiraConnection } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [github, jira] = await Promise.allSettled([
    checkGitHubConnection(),
    checkJiraConnection()
  ]);

  return NextResponse.json({
    github: github.status === "fulfilled" ? github.value : { ok: false, error: "Check failed" },
    jira: jira.status === "fulfilled" ? jira.value : { ok: false, error: "Check failed" }
  });
}
