import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { StudentBulkTable } from "./student-bulk-table";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; programme?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const { q, programme } = await searchParams;

  const students = await db.studentProfile.findMany({
    where: {
      ...(programme && programme !== "ALL" ? { programme } : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { rollNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { email: true, name: true, lastLoginAt: true } },
      batch: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="text-slate-500 mt-1">
          {students.length} students{q || programme ? " (filtered)" : ""} across all batches.
        </p>
      </div>

      <StudentBulkTable students={students} currentQ={q} currentProgramme={programme} />
    </div>
  );
}
