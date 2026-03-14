import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, BIDDING_ROUND_STATUS, COURSE_STATUS } from "@/lib/constants";
import { z } from "zod";

const StatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "CONFIRMED"]),
  // Optional custom timestamps from the admin UI
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
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
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  const round = await db.biddingRound.findUnique({
    where: { id: roundId },
    include: { cycle: true },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const { status, opensAt: customOpensAt, closesAt: customClosesAt } = body;

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
      opensAt: status === "OPEN"
        ? (customOpensAt ? new Date(customOpensAt) : new Date())
        : round.opensAt,
      closesAt: status === "CLOSED"
        ? (customClosesAt ? new Date(customClosesAt) : new Date())
        : (customClosesAt ? new Date(customClosesAt) : round.closesAt),
    },
  });

  await createAuditLog({
    userId,
    action:
      status === "OPEN"
        ? AUDIT_ACTION.ROUND_OPENED
        : status === "CLOSED"
        ? AUDIT_ACTION.ROUND_CLOSED
        : AUDIT_ACTION.ROUND_CLOSED,
    entityType: "BiddingRound",
    entityId: roundId,
    before: { status: oldStatus },
    after: { status, opensAt: customOpensAt, closesAt: customClosesAt },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true });
}
