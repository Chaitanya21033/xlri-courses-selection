import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/student/export/allocations
 * Student downloads their own allocation summary as CSV.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const sp = user.studentProfile;

  const allocations = await db.allocationResult.findMany({
    where: {
      studentProfileId: sp.id,
      status: { in: ["CONFIRMED", "TENTATIVE"] },
    },
    include: {
      offering: {
        include: {
          course: { select: { code: true, title: true, credits: true } },
          professor: { include: { user: { select: { name: true } } } },
        },
      },
      round: { include: { cycle: { include: { term: { select: { name: true } } } } } },
    },
    orderBy: { status: "asc" },
  });

  const headers = [
    "Course Code",
    "Course Title",
    "Credits",
    "Professor",
    "Term",
    "Status",
    "Points Paid",
    "Tie-broken",
  ];

  const rows = allocations.map((a) => [
    a.offering.course.code,
    a.offering.course.title,
    a.offering.course.credits,
    a.offering.professor.user.name,
    a.round.cycle.term.name,
    a.status,
    a.finalPoints,
    a.tieBroken ? "Yes" : "No",
  ]);

  const totalCredits = allocations.reduce(
    (sum, a) => sum + a.offering.course.credits,
    0
  );
  rows.push(["", "TOTAL CREDITS", totalCredits, "", "", "", "", ""]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const filename = `allocations-${sp.rollNumber}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
