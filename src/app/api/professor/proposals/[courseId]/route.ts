import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { SOP_WORD_LIMIT_MIN, SOP_WORD_LIMIT_MAX } from "@/lib/constants";

const TIE_BREAK_METHODS = [
  "CQPI_DESC",
  "GRADE_DESC",
  "COMPOSITE_RANK",
  "LOTTERY",
  "MANUAL_RANK",
  "SOP_SCORE",
] as const;

const PatchSchema = z.object({
  defaultTieBreakMethod: z.enum(TIE_BREAK_METHODS).nullable().optional(),
  defaultTieBreakPrereqCode: z.string().nullable().optional(),
  defaultSopWordLimit: z
    .number()
    .int()
    .min(SOP_WORD_LIMIT_MIN)
    .max(SOP_WORD_LIMIT_MAX)
    .nullable()
    .optional(),
}).refine(
  (data) =>
    data.defaultTieBreakMethod !== "SOP_SCORE" || data.defaultSopWordLimit != null,
  { message: "defaultSopWordLimit is required when method is SOP_SCORE", path: ["defaultSopWordLimit"] }
);

// PATCH — update tie-break preference (and other Course-level defaults) on a proposal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const { courseId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!user?.professorProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || course.createdByProfessorId !== user.professorProfile.id) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  const updated = await db.course.update({
    where: { id: courseId },
    data: {
      defaultTieBreakMethod: body.defaultTieBreakMethod ?? undefined,
      defaultTieBreakPrereqCode: body.defaultTieBreakPrereqCode ?? undefined,
      // Store SOP word limit; clear it if method is not SOP_SCORE
      defaultSopWordLimit:
        body.defaultTieBreakMethod === "SOP_SCORE"
          ? (body.defaultSopWordLimit ?? undefined)
          : null,
    },
  });

  return NextResponse.json(updated);
}
