import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import { z } from "zod";

const OfferingSchema = z.object({
  // Existing course OR new course
  courseId: z.string().optional(),
  // New course fields (used when courseId not provided)
  code: z.string().min(2).optional(),
  title: z.string().min(2).optional(),
  credits: z.number().int().min(1).max(12).optional(),
  description: z.string().optional(),
  prerequisites: z.string().optional(),
  learningGoals: z.string().optional(),
  scheduleNotes: z.string().optional(),
  // Offering fields
  cycleId: z.string(),
  professorId: z.string(),
  eligibility: z.enum(["BM", "HRM", "BOTH"]),
  seatCap: z.number().int().min(1),
  reservedSeatsRound1: z.number().int().min(0).default(0),
  mrb: z.number().int().min(0).default(0),
  additionalNotes: z.string().optional(),
  courseInstructions: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

// GET — list courses (optionally filtered to those not yet linked to a cycle)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unlinked = searchParams.get("unlinked") === "true";
  const cycleId = searchParams.get("cycleId");

  if (unlinked && cycleId) {
    // Return courses NOT already linked to this cycle
    const linkedCourseIds = (
      await db.courseOffering.findMany({
        where: { cycleId },
        select: { courseId: true },
      })
    ).map((o) => o.courseId);

    const courses = await db.course.findMany({
      where: {
        isActive: true,
        id: linkedCourseIds.length > 0 ? { notIn: linkedCourseIds } : undefined,
      },
      orderBy: [{ termNumber: "asc" }, { code: "asc" }],
    });
    return NextResponse.json(courses);
  }

  const courses = await db.course.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;

  let body: z.infer<typeof OfferingSchema>;
  try {
    body = OfferingSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  let courseId = body.courseId;

  // Create new course if no courseId
  if (!courseId) {
    if (!body.code || !body.title || !body.credits) {
      return NextResponse.json({ error: "code, title, and credits required when creating new course" }, { status: 400 });
    }
    const existing = await db.course.findUnique({ where: { code: body.code } });
    if (existing) return NextResponse.json({ error: `Course code "${body.code}" already exists` }, { status: 409 });

    const course = await db.course.create({
      data: {
        code: body.code,
        title: body.title,
        credits: body.credits,
        description: body.description,
        prerequisites: body.prerequisites,
        learningGoals: body.learningGoals,
        scheduleNotes: body.scheduleNotes,
      },
    });
    courseId = course.id;
  }

  const professor = await db.professorProfile.findUnique({ where: { id: body.professorId } });
  if (!professor) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

  // Duplicate check
  const dup = await db.courseOffering.findFirst({
    where: { courseId, cycleId: body.cycleId, professorId: body.professorId },
  });
  if (dup) return NextResponse.json({ error: "This professor already has this course in this cycle" }, { status: 409 });

  const offering = await db.courseOffering.create({
    data: {
      courseId,
      cycleId: body.cycleId,
      professorId: body.professorId,
      eligibility: body.eligibility,
      seatCap: body.seatCap,
      reservedSeatsRound1: body.reservedSeatsRound1,
      mrb: body.mrb,
      additionalNotes: body.additionalNotes,
      courseInstructions: body.courseInstructions,
      status: body.status,
    },
    include: { course: true, professor: { include: { user: true } } },
  });

  await createAuditLog({ userId, action: AUDIT_ACTION.COURSE_CREATED, entityType: "CourseOffering", entityId: offering.id, after: { courseId, professorId: body.professorId } });
  return NextResponse.json(offering, { status: 201 });
}
