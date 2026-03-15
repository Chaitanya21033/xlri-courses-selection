import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProfessorBulkTable } from "./professor-bulk-table";

export default async function AdminProfessorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const { q, department } = await searchParams;

  const professors = await db.professorProfile.findMany({
    where: {
      ...(department && department !== "ALL" ? { department } : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { department: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      user: true,
      courseOfferings: {
        include: {
          course: true,
          _count: { select: { bids: true, allocations: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const departments = await db.professorProfile.findMany({
    select: { department: true },
    distinct: ["department"],
    orderBy: { department: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Faculty</h1>
        <p className="text-slate-500 mt-1">
          {professors.length} professor{professors.length !== 1 ? "s" : ""}
          {q || department ? " (filtered)" : ""} registered.
        </p>
      </div>
      <ProfessorBulkTable
        professors={professors}
        departments={departments.map((d) => d.department)}
        currentQ={q}
        currentDepartment={department}
      />
    </div>
  );
}
