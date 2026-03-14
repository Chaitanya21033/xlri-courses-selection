import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

// DELETE — remove a single attachment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const { id: courseId, attachmentId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!user?.professorProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const attachment = await db.courseAttachment.findUnique({
    where: { id: attachmentId },
    include: { course: true },
  });

  if (
    !attachment ||
    attachment.courseId !== courseId ||
    attachment.course.createdByProfessorId !== user.professorProfile.id
  ) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  // Delete file from disk (ignore if already gone)
  try {
    const filePath = path.join(process.cwd(), "public", attachment.fileUrl);
    await unlink(filePath);
  } catch {
    // file may already be deleted — that's fine
  }

  await db.courseAttachment.delete({ where: { id: attachmentId } });

  return NextResponse.json({ success: true });
}
