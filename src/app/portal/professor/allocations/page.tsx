import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllocationStatusColor, formatDate } from "@/lib/utils";
import { Trophy, Users } from "lucide-react";

export default async function ProfessorAllocationsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    redirect("/portal");
  }

  const userId = (session.user as any)?.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });

  if (!user?.professorProfile) redirect("/auth/login");

  const offerings = await db.courseOffering.findMany({
    where: { professorId: user.professorProfile.id },
    include: {
      course: true,
      cycle: { include: { term: true } },
      allocations: {
        include: {
          student: { include: { user: true } },
          round: true,
        },
        orderBy: { finalPoints: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalConfirmed = offerings.reduce(
    (s, o) => s + o.allocations.filter((a) => a.status === "CONFIRMED").length,
    0
  );
  const totalTentative = offerings.reduce(
    (s, o) => s + o.allocations.filter((a) => a.status === "TENTATIVE").length,
    0
  );
  const totalAllocations = offerings.reduce(
    (s, o) => s + o.allocations.length,
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Allocations</h1>
        <p className="text-slate-500 mt-1">
          Students allocated to your courses across all bidding rounds.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Allocated</p>
            <p className="text-2xl font-bold text-slate-900">{totalAllocations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Confirmed</p>
            <p className="text-2xl font-bold text-emerald-600">{totalConfirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Tentative</p>
            <p className="text-2xl font-bold text-amber-600">{totalTentative}</p>
          </CardContent>
        </Card>
      </div>

      {offerings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Trophy className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No course offerings found.</p>
          </CardContent>
        </Card>
      ) : (
        offerings.map((o) => (
          <Card key={o.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{o.course.title}</CardTitle>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {o.course.code} · {o.cycle.term.name} · {o.seatCap} seats
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {o.allocations.length} / {o.seatCap}
                  </span>
                  <Badge
                    variant={
                      o.allocations.length >= o.seatCap
                        ? "success"
                        : o.allocations.length > 0
                        ? "warning"
                        : "default"
                    }
                  >
                    {o.allocations.length === 0
                      ? "No allocations"
                      : o.allocations.length >= o.seatCap
                      ? "Full"
                      : "Partial"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {o.allocations.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-400 text-center">
                  No students allocated to this course yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Student
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Programme
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Points Paid
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Round
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Tie-break
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.allocations.map((alloc) => (
                        <tr
                          key={alloc.id}
                          className="border-b border-slate-50 hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {alloc.student.user.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {alloc.student.rollNumber}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                alloc.student.programme === "BM"
                                  ? "primary"
                                  : "warning"
                              }
                            >
                              {alloc.student.programme}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700">
                            {alloc.finalPoints}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {alloc.round.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getAllocationStatusColor(
                                alloc.status
                              )}`}
                            >
                              {alloc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {alloc.tieBroken ? (
                              <span className="text-amber-600">
                                Rank #{alloc.tieBreakRank}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {formatDate(alloc.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
