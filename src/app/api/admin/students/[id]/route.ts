import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentProfileId } = await params;

  const student = await db.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      _count: { select: { allocations: true } },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Warn but still allow deletion if they have allocations
  // (admin explicitly chose to delete)

  // Deleting the User cascades to StudentProfile (schema: onDelete: Cascade)
  await db.user.delete({ where: { id: student.userId } });

  return NextResponse.json({ success: true });
}
