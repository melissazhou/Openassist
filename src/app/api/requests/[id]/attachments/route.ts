import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "application/zip", "application/x-zip-compressed",
  "application/json", "application/xml", "text/xml",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const cr = await prisma.changeRequest.findUnique({ where: { id } });
    if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({
        error: `File type not allowed: ${file.type}. Allowed: images, PDF, Office documents, CSV, text, zip.`,
      }, { status: 400 });
    }

    const dirPath = path.join(UPLOAD_DIR, id);
    await fs.mkdir(dirPath, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(dirPath, `${Date.now()}_${safeName}`);
    await fs.writeFile(filePath, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        changeRequestId: id,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        path: filePath,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (err: any) {
    console.error("[attachments POST]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const attachments = await prisma.attachment.findMany({
      where: { changeRequestId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments);
  } catch (err: any) {
    console.error("[attachments GET]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
