import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBid, recomputeOfferingMRB } from "@/lib/bidding-engine";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, BID_STATUS } from "@/lib/constants";
import { z } from "zod";

const BidSchema = z.object({
  offeringId: z.string(),
  roundId: z.string(),
  points: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;

  let body: z.infer<typeof BidSchema>;
  try {
    body = BidSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { offeringId, roundId, points } = body;

  // Server-side validation
  const validation = await validateBid(userId, offeringId, roundId, points);
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

  const sp = user.studentProfile;
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { cycle: true },
  });
  if (!offering) {
    return NextResponse.json({ error: "Offering not found" }, { status: 404 });
  }

  const existing = await db.bid.findUnique({
    where: { userId_offeringId_roundId: { userId, offeringId, roundId } },
  });

  const pointAccount = await db.pointAccount.findUnique({
    where: {
      studentProfileId_cycleId: {
        studentProfileId: sp.id,
        cycleId: offering.cycleId,
      },
    },
  });

  if (!pointAccount) {
    return NextResponse.json({ error: "Point account not found" }, { status: 404 });
  }

  let bid: typeof existing;
  let action: string;

  if (existing) {
    const diff = points - existing.points;
    await db.pointAccount.update({
      where: {
        studentProfileId_cycleId: { studentProfileId: sp.id, cycleId: offering.cycleId },
      },
      data: { reservedPoints: { increment: diff } },
    });

    bid = await db.bid.update({
      where: { id: existing.id },
      data: { points, updatedAt: new Date() },
    });

    await db.bidHistory.create({
      data: {
        bidId: existing.id,
        points,
        action: "UPDATED",
        clientIp: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });

    action = "UPDATED";
  } else {
    await db.pointAccount.update({
      where: {
        studentProfileId_cycleId: { studentProfileId: sp.id, cycleId: offering.cycleId },
      },
      data: { reservedPoints: { increment: points } },
    });

    bid = await db.bid.create({
      data: { userId, offeringId, roundId, points, status: BID_STATUS.ACTIVE },
    });

    await db.bidHistory.create({
      data: {
        bidId: bid!.id,
        points,
        action: "PLACED",
        clientIp: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });

    action = "PLACED";
  }

  // Recompute MRB
  const cycle = await db.biddingCycle.findUnique({ where: { id: offering.cycleId } });
  await recomputeOfferingMRB(offeringId, roundId, cycle?.minBidRequired ?? true);

  await createAuditLog({
    userId,
    action: action === "PLACED" ? AUDIT_ACTION.BID_PLACED : AUDIT_ACTION.BID_UPDATED,
    entityType: "Bid",
    entityId: bid!.id,
    after: { points, offeringId, roundId },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, bid });
}
