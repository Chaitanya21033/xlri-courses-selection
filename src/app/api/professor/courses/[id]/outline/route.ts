import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_SIZE_MB = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const { id: offeringId } = await params;

  const professorUser = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!professorUser?.professorProfile) {
    return NextResponse.json({ error: "Professor profile not found" }, { status: 403 });
  }

  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: true },
  });

  if (!offering || offering.professorId !== professorUser.professorProfile.id) {
    return NextResponse.json({ error: "Course not found or not yours" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx)" },
      { status: 400 }
    );
  }

  // Validate size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    return NextResponse.json(
      { error: `File too large (${sizeMB.toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.` },
      { status: 400 }
    );
  }

  // Build safe filename
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeFilename = `${offeringId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "outlines");
  const filePath = path.join(uploadDir, safeFilename);
  const publicUrl = `/uploads/outlines/${safeFilename}`;

  // Write to disk
  try {
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
  } catch (err) {
    console.error("[outline upload] write error:", err);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }

  // Persist URL to DB
  await db.courseOffering.update({
    where: { id: offeringId },
    data: {
      outlineFileUrl: publicUrl,
      outlineFileName: file.name,
    },
  });

  return NextResponse.json({ url: publicUrl, fileName: file.name }, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const { id: offeringId } = await params;

  const professorUser = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!professorUser?.professorProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.professorId !== professorUser.professorProfile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.courseOffering.update({
    where: { id: offeringId },
    data: { outlineFileUrl: null, outlineFileName: null },
  });

  return NextResponse.json({ success: true });
}
