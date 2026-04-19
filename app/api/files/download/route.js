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
  const format = searchParams.get("format") || "zip";

  if (format === "zip") {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    async function addFolderToZip(folderPath, zipPath = "") {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        const zipEntryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await addFolderToZip(fullPath, zipEntryPath);
        } else {
          const content = await fs.readFile(fullPath);
          zip.file(zipEntryPath, content);
        }
      }
    }

    try {
      await addFolderToZip(WORKDIR, "");
    } catch {
      return NextResponse.json({ error: "No files to download" }, { status: 404 });
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="agentic-files-${Date.now()}.zip"`
      }
    });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}