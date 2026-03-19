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
  points: z.number().int().min(0).max(100000),
  sopText: z.string().optional(),
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

  const { offeringId, roundId, points, sopText } = body;

  // Fetch offering to check SOP requirements before business validation
  const offeringForSop = await db.courseOffering.findUnique({
    where: { id: offeringId },
    select: { requiresSop: true, sopWordLimit: true },
  });

  if (offeringForSop?.requiresSop) {
    const trimmed = sopText?.trim() ?? "";
    if (!trimmed) {
      return NextResponse.json(
        { error: "A Statement of Purpose (SOP) is required for this course." },
        { status: 422 }
      );
    }
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (offeringForSop.sopWordLimit && wordCount > offeringForSop.sopWordLimit) {
      return NextResponse.json(
        { error: `SOP exceeds the ${offeringForSop.sopWordLimit}-word limit (submitted: ${wordCount} words).` },
        { status: 422 }
      );
    }
  }

  // Server-side validation (outside transaction — cheap read-only check)
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

  // Wrap point reservation + bid write in a transaction to prevent race conditions.
  // Using $transaction ensures the point decrement and bid creation are atomic.
  let bid: any;
  let action: string;

  try {
    const result = await db.$transaction(async (tx) => {
      // Re-fetch point account inside transaction for accurate balance
      const pointAccount = await tx.pointAccount.findUnique({
        where: {
          studentProfileId_cycleId: {
            studentProfileId: sp.id,
            cycleId: offering.cycleId,
          },
        },
      });
      if (!pointAccount) throw new Error("Point account not found");

      const existingBid = await tx.bid.findUnique({
        where: { userId_offeringId_roundId: { userId, offeringId, roundId } },
      });

      const currentBidPoints = existingBid?.points ?? 0;
      const diff = points - currentBidPoints;
      const available =
        pointAccount.totalPoints -
        pointAccount.usedPoints -
        pointAccount.reservedPoints;

      // Re-validate inside transaction to catch concurrent updates
      if (diff > available) {
        throw new Error(
          `Insufficient bid points. Available: ${available + currentBidPoints}`
        );
      }

      // Atomically update reserved points
      await tx.pointAccount.update({
        where: {
          studentProfileId_cycleId: {
            studentProfileId: sp.id,
            cycleId: offering.cycleId,
          },
        },
        data: { reservedPoints: { increment: diff } },
      });

      // Build SOP update fields if sopText was submitted
      const sopFields = sopText !== undefined
        ? { sopText: sopText.trim(), sopSubmittedAt: new Date() }
        : {};

      if (existingBid) {
        const updatedBid = await tx.bid.update({
          where: { id: existingBid.id },
          data: { points, updatedAt: new Date(), ...sopFields },
        });
        await tx.bidHistory.create({
          data: {
            bidId: existingBid.id,
            points,
            action: "UPDATED",
            clientIp: req.headers.get("x-forwarded-for") ?? undefined,
          },
        });
        return { bid: updatedBid, action: "UPDATED" };
      } else {
        const newBid = await tx.bid.create({
          data: { userId, offeringId, roundId, points, status: BID_STATUS.ACTIVE, ...sopFields },
        });
        await tx.bidHistory.create({
          data: {
            bidId: newBid.id,
            points,
            action: "PLACED",
            clientIp: req.headers.get("x-forwarded-for") ?? undefined,
          },
        });
        return { bid: newBid, action: "PLACED" };
      }
    });

    bid = result.bid;
    action = result.action;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }

  // Recompute MRB after transaction commits
  const cycle = await db.biddingCycle.findUnique({ where: { id: offering.cycleId } });
  await recomputeOfferingMRB(offeringId, roundId, cycle?.minBidRequired ?? true);

  await createAuditLog({
    userId,
    action: action === "PLACED" ? AUDIT_ACTION.BID_PLACED : AUDIT_ACTION.BID_UPDATED,
    entityType: "Bid",
    entityId: bid.id,
    after: { points, offeringId, roundId },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, bid });
}
