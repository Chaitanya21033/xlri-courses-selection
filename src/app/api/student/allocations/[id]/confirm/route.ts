import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, createNotification } from "@/lib/audit";
import { AUDIT_ACTION, ALLOCATION_STATUS, BID_STATUS, NOTIFICATION_TYPE } from "@/lib/constants";

/**
 * POST /api/student/allocations/[id]/confirm
 * Student confirms a TENTATIVE allocation during the confirmation round.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const { id: allocationId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const allocation = await db.allocationResult.findUnique({
    where: { id: allocationId },
    include: {
      offering: { include: { course: true, cycle: true } },
      round: true,
    },
  });

  if (!allocation) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }
  if (allocation.studentProfileId !== user.studentProfile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (allocation.status !== ALLOCATION_STATUS.TENTATIVE) {
    return NextResponse.json(
      { error: `Cannot confirm an allocation with status: ${allocation.status}` },
      { status: 422 }
    );
  }

  // Verify a confirmation round is currently OPEN for this cycle
  const confirmationRound = await db.biddingRound.findFirst({
    where: {
      cycleId: allocation.offering.cycleId,
      isConfirmationRound: true,
      status: "OPEN",
    },
  });
  if (!confirmationRound) {
    return NextResponse.json(
      { error: "No confirmation round is currently open." },
      { status: 422 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.allocationResult.update({
      where: { id: allocationId },
      data: {
        status: ALLOCATION_STATUS.CONFIRMED,
        confirmedAt: new Date(),
      },
    });

    // Move reserved points to used points (seat is now locked in)
    const pointAccount = await tx.pointAccount.findUnique({
      where: {
        studentProfileId_cycleId: {
          studentProfileId: user.studentProfile!.id,
          cycleId: allocation.offering.cycleId,
        },
      },
    });
    if (pointAccount) {
      await tx.pointAccount.update({
        where: { id: pointAccount.id },
        data: {
          reservedPoints: { decrement: allocation.finalPoints },
          usedPoints: { increment: allocation.finalPoints },
        },
      });
    }

    await tx.confirmationAction.create({
      data: {
        allocationId,
        action: "CONFIRM",
        notes: "Student confirmed via portal",
      },
    });
  });

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.ALLOCATION_CONFIRMED,
    entityType: "AllocationResult",
    entityId: allocationId,
    before: { status: ALLOCATION_STATUS.TENTATIVE },
    after: { status: ALLOCATION_STATUS.CONFIRMED },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true });
}
