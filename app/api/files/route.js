import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";

const WORKDIR = process.env.WORKDIR || (process.env.VERCEL ? "/tmp/agentic-workdir" : path.join(process.cwd(), "workdir"));

export const dynamic = "force-dynamic";

async function ensureWorkdir() {
  try {
    await fs.mkdir(WORKDIR, { recursive: true });
  } catch {}
}

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureWorkdir();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";

  if (action === "list") {
    try {
      const entries = await fs.readdir(WORKDIR, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const stat = await fs.stat(path.join(WORKDIR, entry.name));
          files.push({
            name: entry.name,
            size: stat.size,
            modified: stat.mtime.toISOString()
          });
        } else if (entry.isDirectory()) {
          const dirPath = path.join(WORKDIR, entry.name);
          const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
          files.push({
            name: entry.name,
            type: "directory",
            count: dirEntries.filter(e => e.isFile()).length,
            modified: (await fs.stat(dirPath)).mtime.toISOString()
          });
        }
      }

      return NextResponse.json({ files, workdir: WORKDIR });
    } catch (e) {
      return NextResponse.json({ files: [], workdir: WORKDIR, error: e.message });
    }
  }

  if (action === "read") {
    const filename = searchParams.get("file");
    if (!filename) {
      return NextResponse.json({ error: "No file specified" }, { status: 400 });
    }

    const safePath = path.join(WORKDIR, path.basename(filename));
    try {
      const content = await fs.readFile(safePath, "utf8");
      return NextResponse.json({ content, filename: path.basename(filename) });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await request.json().catch(() => ({}));
  if (!filename) {
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  const safePath = path.join(WORKDIR, path.basename(filename));
  try {
    await fs.unlink(safePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}