import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import { z } from "zod";

const Schema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID is required"),
});

/**
 * DELETE /api/admin/students/bulk-delete
 * Delete multiple students by their StudentProfile IDs.
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

  const profiles = await db.studentProfile.findMany({
    where: { id: { in: body.ids } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const userIds = profiles.map((p) => p.userId);

  // Cascade deletes student profiles via User delete (schema: onDelete Cascade)
  await db.user.deleteMany({ where: { id: { in: userIds } } });

  await createAuditLog({
    userId: adminId,
    action: AUDIT_ACTION.USER_CREATED, // reuse; no dedicated BULK_DELETE action
    entityType: "User",
    entityId: "bulk",
    after: {
      action: "BULK_DELETE_STUDENTS",
      count: userIds.length,
      emails: profiles.map((p) => p.user.email),
    },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, deleted: userIds.length });
}
