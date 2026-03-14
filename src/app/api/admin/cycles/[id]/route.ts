import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  totalBidPoints: z.number().int().min(100).optional(),
  carryForwardEnabled: z.boolean().optional(),
  minBidRequired: z.boolean().optional(),
  crossProgEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const cycle = await db.biddingCycle.findUnique({
    where: { id },
    include: {
      term: true,
      biddingRounds: { orderBy: { roundNumber: "asc" } },
      creditConstraints: true,
      courseOfferings: { include: { course: true, professor: { include: { user: true } }, tieBreakPolicy: true } },
    },
  });
  if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cycle);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;
  const { id } = await params;

  const cycle = await db.biddingCycle.findUnique({ where: { id } });
  if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: z.infer<typeof UpdateSchema>;
  try {
    body = UpdateSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  if (body.isActive) {
    await db.biddingCycle.updateMany({ where: { id: { not: id } }, data: { isActive: false } });
  }

  const updated = await db.biddingCycle.update({ where: { id }, data: body });
  await createAuditLog({ userId, action: AUDIT_ACTION.POLICY_CHANGED, entityType: "BiddingCycle", entityId: id, before: cycle, after: updated });
  return NextResponse.json(updated);
}
