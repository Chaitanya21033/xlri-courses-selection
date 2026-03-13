import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, BIDDING_ROUND_STATUS, COURSE_STATUS } from "@/lib/constants";
import { z } from "zod";

const StatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "CONFIRMED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roundId } = await params;
  const userId = (session.user as any)?.id;

  let body: z.infer<typeof StatusSchema>;
  try {
    body = StatusSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const round = await db.biddingRound.findUnique({
    where: { id: roundId },
    include: { cycle: true },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const { status } = body;

  // Gate: cannot open round if any course in this cycle has no tie-break policy
  if (status === "OPEN") {
    const offeringsWithoutTieBreak = await db.courseOffering.findMany({
      where: {
        cycleId: round.cycleId,
        tieBreakPolicy: null,
        status: { in: [COURSE_STATUS.PUBLISHED, COURSE_STATUS.DRAFT] },
      },
      include: { course: true },
    });

    if (offeringsWithoutTieBreak.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot open round: ${offeringsWithoutTieBreak.length} course(s) are missing tie-break policies.`,
          courses: offeringsWithoutTieBreak.map((o) => o.course.code),
        },
        { status: 422 }
      );
    }

    // Update eligible courses to BIDDING_OPEN
    await db.courseOffering.updateMany({
      where: {
        cycleId: round.cycleId,
        status: COURSE_STATUS.PUBLISHED,
      },
      data: { status: COURSE_STATUS.BIDDING_OPEN },
    });
  }

  if (status === "CLOSED") {
    // Update courses to BIDDING_CLOSED
    await db.courseOffering.updateMany({
      where: {
        cycleId: round.cycleId,
        status: COURSE_STATUS.BIDDING_OPEN,
      },
      data: { status: COURSE_STATUS.BIDDING_CLOSED },
    });
  }

  const oldStatus = round.status;

  await db.biddingRound.update({
    where: { id: roundId },
    data: {
      status,
      opensAt: status === "OPEN" ? new Date() : round.opensAt,
      closesAt: status === "CLOSED" ? new Date() : round.closesAt,
    },
  });

  await createAuditLog({
    userId,
    action:
      status === "OPEN"
        ? AUDIT_ACTION.ROUND_OPENED
        : AUDIT_ACTION.ROUND_CLOSED,
    entityType: "BiddingRound",
    entityId: roundId,
    before: { status: oldStatus },
    after: { status },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true });
}
