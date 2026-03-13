import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWithdrawal, recomputeOfferingMRB } from "@/lib/bidding-engine";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, BID_STATUS } from "@/lib/constants";
import { z } from "zod";

const WithdrawSchema = z.object({
  offeringId: z.string(),
  roundId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;

  let body: z.infer<typeof WithdrawSchema>;
  try {
    body = WithdrawSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { offeringId, roundId } = body;

  const validation = await validateWithdrawal(userId, offeringId, roundId);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 422 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) {
    return NextResponse.json({ error: "Offering not found" }, { status: 404 });
  }

  const bid = await db.bid.findUnique({
    where: { userId_offeringId_roundId: { userId, offeringId, roundId } },
  });
  if (!bid) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }

  const pointsToReimburse = bid.points;

  await db.$transaction(async (tx) => {
    // Mark bid as withdrawn
    await tx.bid.update({
      where: { id: bid.id },
      data: { status: BID_STATUS.WITHDRAWN },
    });

    // Add history record
    await tx.bidHistory.create({
      data: {
        bidId: bid.id,
        points: 0,
        action: "WITHDRAWN",
        clientIp: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });

    // Reimburse points
    if (pointsToReimburse > 0) {
      await tx.pointAccount.update({
        where: {
          studentProfileId_cycleId: {
            studentProfileId: user.studentProfile!.id,
            cycleId: offering.cycleId,
          },
        },
        data: {
          reservedPoints: { decrement: pointsToReimburse },
        },
      });
    }
  });

  // Recompute MRB
  const cycle = await db.biddingCycle.findUnique({ where: { id: offering.cycleId } });
  await recomputeOfferingMRB(offeringId, roundId, cycle?.minBidRequired ?? true);

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.BID_WITHDRAWN,
    entityType: "Bid",
    entityId: bid.id,
    before: { points: bid.points, status: bid.status },
    after: { points: 0, status: "WITHDRAWN" },
    metadata: { reimbursed: pointsToReimburse },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, reimbursed: pointsToReimburse });
}
