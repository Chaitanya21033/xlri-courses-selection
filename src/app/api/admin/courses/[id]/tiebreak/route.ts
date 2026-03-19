import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, SOP_WORD_LIMIT_MIN, SOP_WORD_LIMIT_MAX } from "@/lib/constants";
import { z } from "zod";

const TieBreakSchema = z.object({
  method: z.enum(["CQPI_DESC", "GRADE_DESC", "COMPOSITE_RANK", "LOTTERY", "MANUAL_RANK", "SOP_SCORE"]),
  prerequisiteCourseCode: z.string().optional(),
  compositeWeightJson: z.string().optional(),
  manualRankJson: z.string().optional(),
  sopWordLimit: z.number().int().min(SOP_WORD_LIMIT_MIN).max(SOP_WORD_LIMIT_MAX).optional(),
}).refine(
  (data) => data.method !== "SOP_SCORE" || (data.sopWordLimit != null),
  { message: "sopWordLimit is required when method is SOP_SCORE", path: ["sopWordLimit"] }
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;
  const { id } = await params;

  const offering = await db.courseOffering.findUnique({ where: { id } });
  if (!offering) return NextResponse.json({ error: "Offering not found" }, { status: 404 });

  let body: z.infer<typeof TieBreakSchema>;
  try {
    body = TieBreakSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  const existing = await db.tieBreakPolicy.findUnique({ where: { offeringId: id } });
  if (existing?.isLocked) {
    return NextResponse.json({ error: "Tie-break policy is locked and cannot be changed" }, { status: 422 });
  }

  const { sopWordLimit, ...policyFields } = body;

  const policy = existing
    ? await db.tieBreakPolicy.update({ where: { offeringId: id }, data: policyFields })
    : await db.tieBreakPolicy.create({ data: { offeringId: id, ...policyFields } });

  // Keep requiresSop and sopWordLimit on the offering in sync with the policy method.
  await db.courseOffering.update({
    where: { id },
    data: {
      requiresSop: body.method === "SOP_SCORE",
      sopWordLimit: body.method === "SOP_SCORE" ? sopWordLimit : null,
    },
  });

  await createAuditLog({ userId, action: AUDIT_ACTION.POLICY_CHANGED, entityType: "TieBreakPolicy", entityId: policy.id, before: existing, after: policy });
  return NextResponse.json(policy);
}
