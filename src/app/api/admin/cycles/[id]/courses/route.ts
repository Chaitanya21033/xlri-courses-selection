import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const ELIGIBILITY_OPTIONS = ["BM", "HRM", "GMP", "BM_HRM", "BM_GMP", "HRM_GMP", "ALL"] as const;

const LinkCourseSchema = z.object({
  courseId: z.string().min(1),
  // professorId is optional — if omitted the course's creator professor is used automatically
  professorId: z.string().min(1).optional(),
  eligibility: z.enum(ELIGIBILITY_OPTIONS).default("ALL"),
  seatCap: z.number().int().min(1).max(1000),
  reservedSeatsRound1: z.number().int().min(0).default(0),
  mrb: z.number().int().min(0).default(0),
  additionalNotes: z.string().optional(),
});

// GET — list courses already linked to this cycle
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cycleId } = await params;

  const offerings = await db.courseOffering.findMany({
    where: { cycleId },
    include: {
      course: true,
      professor: { include: { user: { select: { name: true } } } },
      tieBreakPolicy: true,
      _count: { select: { bids: true, allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offerings);
}

// POST — link an existing course to this cycle (create CourseOffering)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cycleId } = await params;

  const cycle = await db.biddingCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  let body: z.infer<typeof LinkCourseSchema>;
  try {
    body = LinkCourseSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify course exists (include tie-break defaults set by professor)
  const course = await db.course.findUnique({ where: { id: body.courseId } });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Resolve professor: use explicitly supplied professorId, otherwise fall back to
  // the professor who originally created the course.
  const resolvedProfessorId = body.professorId ?? course.createdByProfessorId;
  if (!resolvedProfessorId) {
    return NextResponse.json(
      { error: "No professor assigned. Please select a professor or have the course created by a professor first." },
      { status: 400 }
    );
  }

  const professor = await db.professorProfile.findUnique({ where: { id: resolvedProfessorId } });
  if (!professor) {
    return NextResponse.json({ error: "Professor not found" }, { status: 404 });
  }

  // Check if already linked
  const existing = await db.courseOffering.findFirst({
    where: { courseId: body.courseId, cycleId },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Course "${course.code}" is already linked to this cycle` },
      { status: 409 }
    );
  }

  // Determine SOP fields from professor's course defaults
  const autoSop = course.defaultTieBreakMethod === "SOP_SCORE";

  const offering = await db.courseOffering.create({
    data: {
      courseId: body.courseId,
      cycleId,
      professorId: resolvedProfessorId,
      eligibility: body.eligibility,
      seatCap: body.seatCap,
      reservedSeatsRound1: body.reservedSeatsRound1,
      mrb: body.mrb,
      additionalNotes: body.additionalNotes ?? null,
      // Feature 2: open bidding immediately so students can see and bid on the course
      status: "BIDDING_OPEN",
      // Feature 1: sync SOP settings from professor's course defaults
      requiresSop: autoSop,
      sopWordLimit: autoSop ? (course.defaultSopWordLimit ?? null) : null,
    },
    include: {
      course: true,
      professor: { include: { user: { select: { name: true } } } },
    },
  });

  // Feature 1: auto-apply the professor's default tie-break policy if one is defined
  if (course.defaultTieBreakMethod) {
    await db.tieBreakPolicy.create({
      data: {
        offeringId: offering.id,
        method: course.defaultTieBreakMethod,
        prerequisiteCourseCode: course.defaultTieBreakPrereqCode ?? null,
      },
    });
  }

  return NextResponse.json(offering, { status: 201 });
}

// DELETE — remove a course offering from this cycle (only if DRAFT and no bids)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cycleId } = await params;
  const { searchParams } = new URL(req.url);
  const offeringId = searchParams.get("offeringId");

  if (!offeringId) {
    return NextResponse.json({ error: "offeringId required" }, { status: 400 });
  }

  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { _count: { select: { bids: true } } },
  });

  if (!offering || offering.cycleId !== cycleId) {
    return NextResponse.json({ error: "Offering not found" }, { status: 404 });
  }

  if (offering.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Cannot remove offering that is not in DRAFT status" },
      { status: 422 }
    );
  }

  if (offering._count.bids > 0) {
    return NextResponse.json(
      { error: "Cannot remove offering with existing bids" },
      { status: 422 }
    );
  }

  await db.courseOffering.delete({ where: { id: offeringId } });

  return NextResponse.json({ success: true });
}
