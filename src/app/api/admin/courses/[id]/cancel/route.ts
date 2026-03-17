import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, broadcastNotification } from "@/lib/audit";
import { AUDIT_ACTION, COURSE_STATUS, BID_STATUS, NOTIFICATION_TYPE } from "@/lib/constants";
import { z } from "zod";

const CancelSchema = z.object({
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

/**
 * POST /api/admin/courses/[id]/cancel
 * Cancel a course offering. Reimburses all active bid points.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any)?.id;
  const { id: offeringId } = await params;

  let body: z.infer<typeof CancelSchema>;
  try {
    body = CancelSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: true },
  });
  if (!offering) {
    return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
  }
  if (offering.status === COURSE_STATUS.CANCELLED) {
    return NextResponse.json({ error: "Course is already cancelled" }, { status: 422 });
  }
  if (offering.status === COURSE_STATUS.CONFIRMED) {
    return NextResponse.json(
      { error: "Cannot cancel a confirmed course offering" },
      { status: 422 }
    );
  }

  // Get all active/winning bids for this offering
  const activeBids = await db.bid.findMany({
    where: {
      offeringId,
      status: { in: [BID_STATUS.ACTIVE, BID_STATUS.WINNING] },
    },
    include: {
      user: {
        include: { studentProfile: true },
      },
    },
  });

  // Reimburse all bids and collect affected userIds
  const affectedUserIds: string[] = [];

  for (const bid of activeBids) {
    const sp = bid.user.studentProfile;
    if (!sp || bid.points === 0) {
      affectedUserIds.push(bid.userId);
      continue;
    }

    await db.pointAccount.update({
      where: {
        studentProfileId_cycleId: {
          studentProfileId: sp.id,
          cycleId: offering.cycleId,
        },
      },
      data: { reservedPoints: { decrement: bid.points } },
    });

    await db.bid.update({
      where: { id: bid.id },
      data: { status: BID_STATUS.REIMBURSED },
    });

    affectedUserIds.push(bid.userId);
  }

  // Cancel the offering
  await db.courseOffering.update({
    where: { id: offeringId },
    data: { status: COURSE_STATUS.CANCELLED },
  });

  await createAuditLog({
    userId: adminId,
    action: AUDIT_ACTION.COURSE_CANCELLED,
    entityType: "CourseOffering",
    entityId: offeringId,
    before: { status: offering.status },
    after: { status: COURSE_STATUS.CANCELLED, reason: body.reason, bidsReimbursed: activeBids.length },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Notify all affected students
  if (affectedUserIds.length > 0) {
    await broadcastNotification(
      affectedUserIds,
      {
        type: NOTIFICATION_TYPE.COURSE_CANCELLED,
        title: `Course Cancelled: ${offering.course.code}`,
        message: `"${offering.course.title}" has been cancelled. Any bid points you allocated to this course have been reimbursed. Reason: ${body.reason}`,
      },
      adminId
    );
  }

  return NextResponse.json({
    success: true,
    bidsReimbursed: activeBids.length,
  });
}
