import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import { z } from "zod";

const CycleSchema = z.object({
  name: z.string().min(2),
  termId: z.string(),
  totalBidPoints: z.number().int().min(100).max(10000),
  carryForwardEnabled: z.boolean().default(false),
  minBidRequired: z.boolean().default(true),
  crossProgEnabled: z.boolean().default(false),
  isActive: z.boolean().default(false),
  minCredits: z.number().int().min(0).optional(),
  maxCredits: z.number().int().min(0).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cycles = await db.biddingCycle.findMany({
    include: { term: true, biddingRounds: { orderBy: { roundNumber: "asc" } }, _count: { select: { courseOfferings: true, pointAccounts: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cycles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;

  let body: z.infer<typeof CycleSchema>;
  try {
    body = CycleSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const term = await db.academicTerm.findUnique({ where: { id: body.termId } });
  if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

  // If activating this cycle, deactivate all others
  if (body.isActive) {
    await db.biddingCycle.updateMany({ data: { isActive: false } });
  }

  const cycle = await db.biddingCycle.create({
    data: {
      name: body.name,
      termId: body.termId,
      totalBidPoints: body.totalBidPoints,
      carryForwardEnabled: body.carryForwardEnabled,
      minBidRequired: body.minBidRequired,
      crossProgEnabled: body.crossProgEnabled,
      isActive: body.isActive,
    },
  });

  // Create credit constraints if provided
  if (body.minCredits !== undefined && body.maxCredits !== undefined) {
    await db.creditConstraint.createMany({
      data: [
        { cycleId: cycle.id, programme: "BM", minCredits: body.minCredits, maxCredits: body.maxCredits },
        { cycleId: cycle.id, programme: "HRM", minCredits: body.minCredits, maxCredits: body.maxCredits },
      ],
    });
  }

  await createAuditLog({ userId, action: AUDIT_ACTION.COURSE_CREATED, entityType: "BiddingCycle", entityId: cycle.id, after: cycle });
  return NextResponse.json(cycle, { status: 201 });
}
