import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// All eligibility values supported
export const ELIGIBILITY_OPTIONS = ["BM", "HRM", "GMP", "BM_HRM", "BM_GMP", "HRM_GMP", "ALL"] as const;
export type EligibilityValue = (typeof ELIGIBILITY_OPTIONS)[number];

export const ELIGIBILITY_LABELS: Record<EligibilityValue, string> = {
  BM: "BM only",
  HRM: "HRM only",
  GMP: "GMP only",
  BM_HRM: "BM + HRM",
  BM_GMP: "BM + GMP",
  HRM_GMP: "HRM + GMP",
  ALL: "All programmes",
};

const TIE_BREAK_METHODS = ["CQPI_DESC", "GRADE_DESC", "COMPOSITE_RANK", "LOTTERY", "MANUAL_RANK"] as const;

const CreateCourseSchema = z.object({
  code: z.string().min(2).max(20),
  title: z.string().min(3).max(200),
  credits: z.number().int().min(1).max(12),
  description: z.string().optional(),
  prerequisites: z.string().optional(),
  learningGoals: z.string().optional(),
  scheduleNotes: z.string().optional(),
  termNumber: z.number().int().min(1).max(12).optional(),
  defaultEligibility: z.enum(ELIGIBILITY_OPTIONS).default("ALL"),
  defaultSeatCap: z.number().int().min(1).max(1000).default(40),
  defaultTieBreakMethod: z.enum(TIE_BREAK_METHODS).optional(),
  defaultTieBreakPrereqCode: z.string().optional(),
});

// GET — list all courses created by this professor
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!user?.professorProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const profId = user.professorProfile.id;

  // Courses created by this professor (standalone)
  const standalones = await db.course.findMany({
    where: { createdByProfessorId: profId },
    include: {
      offerings: {
        include: {
          cycle: { include: { term: true } },
          tieBreakPolicy: true,
          _count: { select: { bids: true, allocations: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(standalones);
}

// POST — create a new course
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any)?.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!user?.professorProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let body: z.infer<typeof CreateCourseSchema>;
  try {
    body = CreateCourseSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  // Check unique course code
  const existing = await db.course.findUnique({ where: { code: body.code } });
  if (existing) {
    return NextResponse.json({ error: `Course code "${body.code}" already exists` }, { status: 409 });
  }

  const course = await db.course.create({
    data: {
      code: body.code,
      title: body.title,
      credits: body.credits,
      description: body.description ?? null,
      prerequisites: body.prerequisites ?? null,
      learningGoals: body.learningGoals ?? null,
      scheduleNotes: body.scheduleNotes ?? null,
      termNumber: body.termNumber ?? null,
      defaultEligibility: body.defaultEligibility,
      defaultSeatCap: body.defaultSeatCap,
      defaultTieBreakMethod: body.defaultTieBreakMethod ?? null,
      defaultTieBreakPrereqCode: body.defaultTieBreakPrereqCode ?? null,
      createdByProfessorId: user.professorProfile.id,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
