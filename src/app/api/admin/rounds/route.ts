import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import { z } from "zod";

const RoundSchema = z.object({
  cycleId: z.string(),
  roundNumber: z.number().int().min(1),
  name: z.string().min(2),
  // Accept both datetime-local ("2026-03-14T12:48") and full ISO strings
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  isConfirmationRound: z.boolean().default(false),
  quotaRelaxed: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;

  let body: z.infer<typeof RoundSchema>;
  try {
    body = RoundSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cycle = await db.biddingCycle.findUnique({ where: { id: body.cycleId } });
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

  const dup = await db.biddingRound.findUnique({
    where: { cycleId_roundNumber: { cycleId: body.cycleId, roundNumber: body.roundNumber } },
  });
  if (dup) return NextResponse.json({ error: `Round ${body.roundNumber} already exists in this cycle` }, { status: 409 });

  const round = await db.biddingRound.create({
    data: {
      cycleId: body.cycleId,
      roundNumber: body.roundNumber,
      name: body.name,
      opensAt: body.opensAt ? new Date(body.opensAt) : null,
      closesAt: body.closesAt ? new Date(body.closesAt) : null,
      isConfirmationRound: body.isConfirmationRound,
      quotaRelaxed: body.quotaRelaxed,
      status: "DRAFT",
    },
  });

  await createAuditLog({ userId, action: AUDIT_ACTION.COURSE_CREATED, entityType: "BiddingRound", entityId: round.id, after: round });
  return NextResponse.json(round, { status: 201 });
}
