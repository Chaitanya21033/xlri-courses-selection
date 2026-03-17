import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION, COURSE_STATUS } from "@/lib/constants";
import { z } from "zod";

const UpdateSchema = z.object({
  eligibility: z.enum(["BM", "HRM", "BOTH"]).optional(),
  seatCap: z.number().int().min(1).optional(),
  reservedSeatsRound1: z.number().int().min(0).optional(),
  mrb: z.number().int().min(0).optional(),
  additionalNotes: z.string().optional(),
  courseInstructions: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "BIDDING_OPEN", "BIDDING_CLOSED", "CONFIRMED", "CANCELLED"]).optional(),
  // Course base fields
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  prerequisites: z.string().optional(),
  learningGoals: z.string().optional(),
  scheduleNotes: z.string().optional(),
  credits: z.number().int().min(1).max(12).optional(),
  professorId: z.string().optional(),
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
  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: {
      course: true,
      professor: { include: { user: true } },
      tieBreakPolicy: true,
      cycle: { include: { term: true } },
      _count: { select: { bids: true, allocations: true } },
    },
  });
  if (!offering) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(offering);
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

  const offering = await db.courseOffering.findUnique({ where: { id }, include: { course: true } });
  if (!offering) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent editing active bidding offerings in sensitive fields
  if (offering.status === "BIDDING_OPEN") {
    return NextResponse.json({ error: "Cannot edit offering while bidding is open" }, { status: 422 });
  }

  let body: z.infer<typeof UpdateSchema>;
  try {
    body = UpdateSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  const { title, description, prerequisites, learningGoals, scheduleNotes, credits, ...offeringFields } = body;

  // Update base course if fields provided
  if (title || description !== undefined || prerequisites !== undefined || learningGoals !== undefined || scheduleNotes !== undefined || credits) {
    await db.course.update({
      where: { id: offering.courseId },
      data: { title, description, prerequisites, learningGoals, scheduleNotes, credits },
    });
  }

  const updated = await db.courseOffering.update({
    where: { id },
    data: offeringFields,
    include: { course: true, professor: { include: { user: true } }, tieBreakPolicy: true },
  });

  await createAuditLog({ userId, action: AUDIT_ACTION.COURSE_UPDATED, entityType: "CourseOffering", entityId: id, before: offering, after: updated });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;
  const { id } = await params;

  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: { course: true, _count: { select: { bids: true, allocations: true } } },
  });
  if (!offering) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow deletion of DRAFT or CANCELLED offerings
  if (![COURSE_STATUS.DRAFT, COURSE_STATUS.CANCELLED].includes(offering.status as any)) {
    return NextResponse.json(
      { error: "Only DRAFT or CANCELLED offerings can be deleted. Cancel the course first." },
      { status: 422 }
    );
  }

  // Delete related records first
  await db.tieBreakPolicy.deleteMany({ where: { offeringId: id } });
  await db.courseOffering.delete({ where: { id } });

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.COURSE_DELETED,
    entityType: "CourseOffering",
    entityId: id,
    before: { courseCode: offering.course.code, courseTitle: offering.course.title },
  });

  return NextResponse.json({ success: true });
}
