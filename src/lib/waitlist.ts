/**
 * Waitlist promotion logic.
 *
 * When a student withdraws from a confirmed/tentative allocation during the
 * confirmation round, the next active waitlist entry for that offering is
 * promoted to a TENTATIVE allocation.
 */

import { db } from "./db";
import { ALLOCATION_STATUS, NOTIFICATION_TYPE } from "./constants";
import { createNotification } from "./audit";

export async function promoteWaitlist(
  offeringId: string,
  roundId: string
): Promise<void> {
  // Find the next active waitlist entry ordered by position
  const next = await db.waitlistEntry.findFirst({
    where: { offeringId, isActive: true },
    orderBy: { position: "asc" },
    include: {
      student: { include: { user: true } },
    },
  });

  if (!next) return;

  const existingAllocation = await db.allocationResult.findUnique({
    where: {
      studentProfileId_offeringId_roundId: {
        studentProfileId: next.studentProfileId,
        offeringId,
        roundId,
      },
    },
  });

  await db.$transaction(async (tx) => {
    if (existingAllocation) {
      // Restore an existing WITHDRAWN allocation to TENTATIVE
      await tx.allocationResult.update({
        where: { id: existingAllocation.id },
        data: {
          status: ALLOCATION_STATUS.TENTATIVE,
          withdrawnAt: null,
          confirmedAt: null,
        },
      });
    } else {
      // Create a fresh TENTATIVE allocation from the losing bid
      const losingBid = await tx.bid.findFirst({
        where: {
          userId: next.student.userId,
          offeringId,
          roundId,
        },
      });

      await tx.allocationResult.create({
        data: {
          studentProfileId: next.studentProfileId,
          offeringId,
          roundId,
          status: ALLOCATION_STATUS.TENTATIVE,
          finalPoints: losingBid?.points ?? 0,
          tieBroken: false,
        },
      });
    }

    // Deactivate this waitlist entry
    await tx.waitlistEntry.update({
      where: { id: next.id },
      data: { isActive: false },
    });

    // Resequence remaining waitlist positions
    const remaining = await tx.waitlistEntry.findMany({
      where: { offeringId, isActive: true },
      orderBy: { position: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.waitlistEntry.update({
        where: { id: remaining[i].id },
        data: { position: i + 1 },
      });
    }
  });

  // Notify the promoted student
  await createNotification({
    userId: next.student.userId,
    type: NOTIFICATION_TYPE.ALLOCATION_RESULT,
    title: "Waitlist Promotion — Seat Available",
    message: `A seat has opened for your waitlisted course. You have been provisionally allocated. Please confirm during the confirmation round.`,
  });
}
