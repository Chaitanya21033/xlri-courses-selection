import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "course-attachments");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file

// GET — list attachments for a course
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const attachments = await db.courseAttachment.findMany({
    where: { courseId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(attachments);
}

// POST — upload one or more files
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const { id: courseId } = await params;

  // Verify the course belongs to this professor
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!user?.professorProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || course.createdByProfessorId !== user.professorProfile.id) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const created = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds the 50 MB size limit` },
        { status: 413 }
      );
    }

    const ext = path.extname(file.name);
    const safeName = `${courseId}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    const fileUrl = `/uploads/course-attachments/${safeName}`;

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const attachment = await db.courseAttachment.create({
      data: {
        courseId,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type || null,
      },
    });

    created.push(attachment);
  }

  return NextResponse.json(created, { status: 201 });
}
