import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, COURSE_STATUS } from "@/lib/constants";
import { z } from "zod";

const Schema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID is required"),
});

/**
 * DELETE /api/admin/courses/bulk-delete
 * Delete multiple CourseOffering IDs (only DRAFT or CANCELLED).
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any)?.id;

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  // Safety: only delete offerings in DRAFT or CANCELLED state
  const safe = await db.courseOffering.findMany({
    where: {
      id: { in: body.ids },
      status: { in: [COURSE_STATUS.DRAFT, COURSE_STATUS.CANCELLED] },
    },
    include: { course: { select: { code: true } } },
  });

  const blocked = body.ids.filter((id) => !safe.find((o) => o.id === id));
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        error: "Some offerings cannot be deleted (must be DRAFT or CANCELLED).",
        blocked,
      },
      { status: 422 }
    );
  }

  await db.courseOffering.deleteMany({ where: { id: { in: body.ids } } });

  await createAuditLog({
    userId: adminId,
    action: AUDIT_ACTION.COURSE_CANCELLED,
    entityType: "CourseOffering",
    entityId: "bulk",
    after: {
      action: "BULK_DELETE_OFFERINGS",
      count: safe.length,
      codes: safe.map((o) => o.course.code),
    },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, deleted: safe.length });
}
