import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, ALLOCATION_STATUS, BID_STATUS } from "@/lib/constants";
import { promoteWaitlist } from "@/lib/waitlist";

/**
 * POST /api/student/allocations/[id]/withdraw
 * Student withdraws from a TENTATIVE or CONFIRMED allocation during the confirmation round.
 * Points are reimbursed and waitlist promotion is triggered.
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
  if (
    allocation.status !== ALLOCATION_STATUS.TENTATIVE &&
    allocation.status !== ALLOCATION_STATUS.CONFIRMED
  ) {
    return NextResponse.json(
      { error: `Cannot withdraw from allocation with status: ${allocation.status}` },
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

  const wasConfirmed = allocation.status === ALLOCATION_STATUS.CONFIRMED;

  await db.$transaction(async (tx) => {
    await tx.allocationResult.update({
      where: { id: allocationId },
      data: {
        status: ALLOCATION_STATUS.WITHDRAWN,
        withdrawnAt: new Date(),
      },
    });

    // Reimburse points back from reserved (tentative) or used (confirmed)
    const pointAccount = await tx.pointAccount.findUnique({
      where: {
        studentProfileId_cycleId: {
          studentProfileId: user.studentProfile!.id,
          cycleId: allocation.offering.cycleId,
        },
      },
    });
    if (pointAccount && allocation.finalPoints > 0) {
      await tx.pointAccount.update({
        where: { id: pointAccount.id },
        data: wasConfirmed
          ? { usedPoints: { decrement: allocation.finalPoints } }
          : { reservedPoints: { decrement: allocation.finalPoints } },
      });
    }

    // Mark the underlying bid as WITHDRAWN
    await tx.bid.updateMany({
      where: {
        userId,
        offeringId: allocation.offeringId,
        roundId: allocation.roundId,
        status: { in: [BID_STATUS.WINNING, BID_STATUS.REIMBURSED] },
      },
      data: { status: BID_STATUS.WITHDRAWN },
    });

    await tx.confirmationAction.create({
      data: {
        allocationId,
        action: "WITHDRAW",
        notes: "Student withdrew via portal during confirmation round",
      },
    });
  });

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.ALLOCATION_WITHDRAWN,
    entityType: "AllocationResult",
    entityId: allocationId,
    before: { status: allocation.status },
    after: { status: ALLOCATION_STATUS.WITHDRAWN },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Promote next person from waitlist (if any)
  await promoteWaitlist(allocation.offeringId, allocation.roundId);

  return NextResponse.json({ success: true });
}
