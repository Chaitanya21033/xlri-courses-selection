import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

/**
 * GET /api/admin/export/allocations?roundId=xxx
 * Export all allocation results for a round as CSV.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roundId = searchParams.get("roundId");
  if (!roundId) {
    return NextResponse.json({ error: "roundId is required" }, { status: 400 });
  }

  const allocations = await db.allocationResult.findMany({
    where: { roundId },
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          batch: { select: { name: true } },
        },
      },
      offering: {
        include: {
          course: { select: { code: true, title: true, credits: true } },
          professor: { include: { user: { select: { name: true } } } },
        },
      },
      round: { include: { cycle: { include: { term: { select: { name: true } } } } } },
    },
    orderBy: [{ offering: { course: { code: "asc" } } }, { status: "asc" }],
  });

  const headers = [
    "Roll No",
    "Student Name",
    "Email",
    "Programme",
    "Batch",
    "Course Code",
    "Course Title",
    "Credits",
    "Professor",
    "Term",
    "Status",
    "Points Paid",
    "Tie-broken",
    "Tie-break Rank",
    "Confirmed At",
    "Withdrawn At",
  ];

  const rows = allocations.map((a) => [
    a.student.rollNumber,
    a.student.user.name,
    a.student.user.email,
    a.student.programme,
    a.student.batch.name,
    a.offering.course.code,
    a.offering.course.title,
    a.offering.course.credits,
    a.offering.professor.user.name,
    a.round.cycle.term.name,
    a.status,
    a.finalPoints,
    a.tieBroken ? "Yes" : "No",
    a.tieBreakRank ?? "",
    a.confirmedAt ? new Date(a.confirmedAt).toISOString() : "",
    a.withdrawnAt ? new Date(a.withdrawnAt).toISOString() : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  // Audit log for PII data export
  const adminId = (session.user as any)?.id;
  await createAuditLog({
    userId: adminId,
    action: "DATA_EXPORT",
    entityType: "AllocationResult",
    entityId: roundId,
    after: { type: "CSV_EXPORT", recordCount: allocations.length },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="allocations-${roundId}.csv"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
