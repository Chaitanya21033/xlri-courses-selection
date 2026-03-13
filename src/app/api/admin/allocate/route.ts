import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocateCourse } from "@/lib/bidding-engine";
import { createAuditLog, broadcastNotification } from "@/lib/audit";
import {
  AUDIT_ACTION,
  ALLOCATION_STATUS,
  BID_STATUS,
  NOTIFICATION_TYPE,
} from "@/lib/constants";
import { z } from "zod";

const AllocateSchema = z.object({
  roundId: z.string(),
});

/**
 * POST /api/admin/allocate
 *
 * Run full allocation engine for all courses in a bidding round.
 * This must be called after the round is CLOSED.
 * Produces AllocationResult records and updates bid statuses.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;

  let body: z.infer<typeof AllocateSchema>;
  try {
    body = AllocateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { roundId } = body;

  const round = await db.biddingRound.findUnique({
    where: { id: roundId },
    include: {
      cycle: true,
      bids: {
        where: { status: { in: [BID_STATUS.ACTIVE, BID_STATUS.WINNING, BID_STATUS.LOSING] } },
        select: { offeringId: true },
        distinct: ["offeringId"],
      },
    },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (round.status !== "CLOSED") {
    return NextResponse.json(
      { error: "Round must be CLOSED before running allocation" },
      { status: 422 }
    );
  }

  const offeringIds = [...new Set(round.bids.map((b) => b.offeringId))];
  const errors: string[] = [];
  let totalWinners = 0;
  let totalLosers = 0;

  for (const offeringId of offeringIds) {
    try {
      const decisions = await allocateCourse(offeringId, roundId, userId);

      // Process allocations sequentially (libsql supports batch ops)
      for (const d of decisions) {
          // Upsert allocation result
          await db.allocationResult.upsert({
            where: {
              studentProfileId_offeringId_roundId: {
                studentProfileId: d.studentProfileId,
                offeringId,
                roundId,
              },
            },
            create: {
              studentProfileId: d.studentProfileId,
              offeringId,
              roundId,
              status: d.status === "WINNING" ? ALLOCATION_STATUS.TENTATIVE : ALLOCATION_STATUS.WITHDRAWN,
              finalPoints: d.finalPoints,
              tieBroken: d.tieBroken,
              tieBreakRank: d.tieBreakRank,
            },
            update: {
              status: d.status === "WINNING" ? ALLOCATION_STATUS.TENTATIVE : ALLOCATION_STATUS.WITHDRAWN,
              finalPoints: d.finalPoints,
              tieBroken: d.tieBroken,
              tieBreakRank: d.tieBreakRank,
            },
          });

          // Update bid status
          await db.bid.updateMany({
            where: {
              userId: d.userId,
              offeringId,
              roundId,
              status: { in: [BID_STATUS.ACTIVE, BID_STATUS.WINNING, BID_STATUS.LOSING] },
            },
            data: {
              status: d.status === "WINNING" ? BID_STATUS.WINNING : BID_STATUS.LOSING,
            },
          });

          // Reimburse losing bids
          if (d.status === "LOSING") {
            const lostBid = await db.bid.findFirst({
              where: { userId: d.userId, offeringId, roundId },
              include: {
                user: {
                  include: {
                    studentProfile: { select: { id: true } },
                  },
                },
              },
            });

            if (lostBid && lostBid.points > 0) {
              const sp = (lostBid.user as any).studentProfile;
              await db.pointAccount.update({
                where: {
                  studentProfileId_cycleId: {
                    studentProfileId: sp.id,
                    cycleId: round.cycleId,
                  },
                },
                data: { reservedPoints: { decrement: lostBid.points } },
              });
              await db.bid.update({
                where: { id: lostBid.id },
                data: { status: BID_STATUS.REIMBURSED },
              });
            }
          }
        }

      totalWinners += decisions.filter((d) => d.status === "WINNING").length;
      totalLosers += decisions.filter((d) => d.status === "LOSING").length;

      // Audit tie-break if used
      const tieBroken = decisions.some((d) => d.tieBroken);
      if (tieBroken) {
        await createAuditLog({
          userId,
          action: AUDIT_ACTION.TIEBREAK_RESOLVED,
          entityType: "CourseOffering",
          entityId: offeringId,
          metadata: {
            roundId,
            tieBrokenCount: decisions.filter((d) => d.tieBroken).length,
          },
        });
      }
    } catch (e: any) {
      errors.push(`${offeringId}: ${e.message}`);
    }
  }

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.ALLOCATION_CREATED,
    entityType: "BiddingRound",
    entityId: roundId,
    after: { totalWinners, totalLosers, errorsCount: errors.length },
  });

  return NextResponse.json({
    success: true,
    totalWinners,
    totalLosers,
    errors: errors.length > 0 ? errors : undefined,
  });
}
