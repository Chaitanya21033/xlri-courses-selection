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

  const { id: professorProfileId } = await params;

  const prof = await db.professorProfile.findUnique({
    where: { id: professorProfileId },
    include: {
      courseOfferings: {
        include: { _count: { select: { bids: true } } },
      },
    },
  });

  if (!prof) {
    return NextResponse.json({ error: "Professor not found" }, { status: 404 });
  }

  // Block deletion if any of their offerings have bids
  const hasActiveBids = prof.courseOfferings.some((o) => o._count.bids > 0);
  if (hasActiveBids) {
    return NextResponse.json(
      { error: "Cannot delete professor with active course bids. Close the bidding round first." },
      { status: 422 }
    );
  }

  // Deleting the User cascades to ProfessorProfile (schema: onDelete: Cascade)
  await db.user.delete({ where: { id: prof.userId } });

  return NextResponse.json({ success: true });
}
