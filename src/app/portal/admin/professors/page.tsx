import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Users, BookMarked, GraduationCap } from "lucide-react";
import { DeleteProfessorButton } from "./delete-button";

export default async function AdminProfessorsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const professors = await db.professorProfile.findMany({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty</h1>
          <p className="text-slate-500 mt-1">
            All registered professors and their course assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          <span>{professors.length} total</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Designation
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Courses
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Bids
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Allocations
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {professors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <GraduationCap className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-400 text-sm">No professors registered yet.</p>
                    </td>
                  </tr>
                ) : (
                  professors.map((prof) => {
                    const totalBids = prof.courseOfferings.reduce(
                      (sum, o) => sum + o._count.bids,
                      0
                    );
                    const totalAllocations = prof.courseOfferings.reduce(
                      (sum, o) => sum + o._count.allocations,
                      0
                    );
                    return (
                      <tr
                        key={prof.id}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-indigo-700">
                                {prof.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{prof.user.name}</p>
                              <p className="text-xs text-slate-400">{prof.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{prof.department}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {prof.designation ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <BookMarked className="h-3.5 w-3.5 text-slate-400" />
                            {prof.courseOfferings.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-indigo-700">
                          {totalBids}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">
                          {totalAllocations}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={prof.isActive ? "success" : "warning"}>
                            {prof.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {formatDate(prof.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeleteProfessorButton professorId={prof.id} name={prof.user.name} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Per-professor course breakdown */}
      {professors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Course Assignments</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {professors.map((prof) => (
              <Card key={prof.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{prof.user.name}</CardTitle>
                  <p className="text-xs text-slate-400">{prof.department}</p>
                </CardHeader>
                <CardContent>
                  {prof.courseOfferings.length === 0 ? (
                    <p className="text-sm text-slate-400">No courses assigned.</p>
                  ) : (
                    <ul className="space-y-2">
                      {prof.courseOfferings.map((o) => (
                        <li
                          key={o.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-medium text-slate-800">{o.course.title}</span>
                            <span className="ml-2 text-xs text-slate-400">{o.course.code}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{o._count.bids} bids</span>
                            <span className="text-emerald-600">{o._count.allocations} alloc.</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
