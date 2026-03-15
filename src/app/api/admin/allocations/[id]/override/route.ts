import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, ALLOCATION_STATUS } from "@/lib/constants";
import { z } from "zod";

const OverrideSchema = z.object({
  status: z.enum(["CONFIRMED", "TENTATIVE", "WITHDRAWN"]),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

/**
 * PATCH /api/admin/allocations/[id]/override
 * Admin manually changes an allocation status with mandatory reason.
 * Creates an OVERRIDE_APPLIED audit log with before/after state.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const { id: allocationId } = await params;

  let body: z.infer<typeof OverrideSchema>;
  try {
    body = OverrideSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  const allocation = await db.allocationResult.findUnique({
    where: { id: allocationId },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
      offering: { include: { course: { select: { code: true, title: true } } } },
    },
  });

  if (!allocation) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  const before = {
    status: allocation.status,
    confirmedAt: allocation.confirmedAt,
    withdrawnAt: allocation.withdrawnAt,
  };

  const updateData: Record<string, any> = { status: body.status };
  if (body.status === "CONFIRMED") updateData.confirmedAt = new Date();
  if (body.status === "WITHDRAWN") updateData.withdrawnAt = new Date();
  if (body.status === "TENTATIVE") {
    updateData.confirmedAt = null;
    updateData.withdrawnAt = null;
  }

  const updated = await db.allocationResult.update({
    where: { id: allocationId },
    data: updateData,
  });

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.OVERRIDE_APPLIED,
    entityType: "AllocationResult",
    entityId: allocationId,
    before,
    after: {
      status: body.status,
      reason: body.reason,
      student: allocation.student.user.email,
      course: allocation.offering.course.code,
    },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, allocation: updated });
}
