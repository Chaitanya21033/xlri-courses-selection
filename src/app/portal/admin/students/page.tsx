import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { DeleteStudentButton } from "./delete-button";

export default async function AdminStudentsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const students = await db.studentProfile.findMany({
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
          {students.length} registered students across all batches.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Roll No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Programme</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Batch</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CQPI</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <GraduationCap className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-400 text-sm">No students registered.</p>
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-slate-700 text-xs">{s.rollNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.user.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.programme === "BM" ? "primary" : "warning"}>
                          {s.programme}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{s.batch.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {s.cqpi.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.isActive ? "success" : "destructive"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteStudentButton studentId={s.id} name={s.user.name} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
