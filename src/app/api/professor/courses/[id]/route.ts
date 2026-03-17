import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import { z } from "zod";

const UpdateSchema = z.object({
  description: z.string().optional(),
  prerequisites: z.string().optional(),
  learningGoals: z.string().optional(),
  scheduleNotes: z.string().optional(),
  additionalNotes: z.string().optional(),
  courseInstructions: z.string().optional(),
  seatCap: z.number().int().min(1).optional(),
  eligibility: z.enum(["BM", "HRM", "BOTH"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;
  const { id } = await params;

  const user = await db.user.findUnique({ where: { id: userId }, include: { professorProfile: true } });
  if (!user?.professorProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: { course: true, tieBreakPolicy: true, cycle: { include: { term: true } }, _count: { select: { bids: true, allocations: true } } },
  });
  if (!offering) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offering.professorId !== user.professorProfile.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(offering);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;
  const { id } = await params;

  const user = await db.user.findUnique({ where: { id: userId }, include: { professorProfile: true } });
  if (!user?.professorProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const offering = await db.courseOffering.findUnique({ where: { id }, include: { course: true } });
  if (!offering) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offering.professorId !== user.professorProfile.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (offering.status === "BIDDING_OPEN") {
    return NextResponse.json({ error: "Cannot edit course while bidding is open" }, { status: 422 });
  }

  let body: z.infer<typeof UpdateSchema>;
  try {
    body = UpdateSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { description, prerequisites, learningGoals, scheduleNotes, ...offeringFields } = body;

  if (description !== undefined || prerequisites !== undefined || learningGoals !== undefined || scheduleNotes !== undefined) {
    await db.course.update({ where: { id: offering.courseId }, data: { description, prerequisites, learningGoals, scheduleNotes } });
  }

  const updated = await db.courseOffering.update({ where: { id }, data: offeringFields, include: { course: true, tieBreakPolicy: true } });

  await createAuditLog({ userId, action: AUDIT_ACTION.COURSE_UPDATED, entityType: "CourseOffering", entityId: id, before: offering, after: updated });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;
  const { id } = await params;

  const user = await db.user.findUnique({ where: { id: userId }, include: { professorProfile: true } });
  if (!user?.professorProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!offering) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offering.professorId !== user.professorProfile.id) {
    return NextResponse.json({ error: "Forbidden — you can only delete courses you created" }, { status: 403 });
  }

  // Only allow deletion of DRAFT or CANCELLED offerings
  if (!["DRAFT", "CANCELLED"].includes(offering.status)) {
    return NextResponse.json(
      { error: "Only DRAFT or CANCELLED offerings can be deleted." },
      { status: 422 }
    );
  }

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
