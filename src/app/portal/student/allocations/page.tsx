import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllocationStatusColor, formatDate } from "@/lib/utils";
import { Trophy, Download } from "lucide-react";

export default async function StudentAllocationsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "STUDENT") {
    redirect("/portal");
  }

  const userId = (session.user as any)?.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });

  if (!user?.studentProfile) redirect("/auth/login");

  const sp = user.studentProfile;

  const allocations = await db.allocationResult.findMany({
    where: { studentProfileId: sp.id },
    include: {
      offering: {
        include: {
          course: true,
          professor: { include: { user: true } },
        },
      },
      round: { include: { cycle: { include: { term: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const confirmed = allocations.filter((a) => a.status === "CONFIRMED");
  const tentative = allocations.filter((a) => a.status === "TENTATIVE");
  const totalCredits = confirmed.reduce(
    (sum, a) => sum + a.offering.course.credits,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Allocations</h1>
          <p className="text-slate-500 mt-1">
            Course allocations across all bidding rounds.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Confirmed Courses</p>
            <p className="text-2xl font-bold text-emerald-600">{confirmed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Tentative</p>
            <p className="text-2xl font-bold text-amber-600">{tentative.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Confirmed Credits</p>
            <p className="text-2xl font-bold text-slate-900">{totalCredits}</p>
          </CardContent>
        </Card>
      </div>

      {allocations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No allocations yet. Participate in bidding rounds to get courses.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Allocation Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Faculty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Credits</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pts Paid</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Term</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tie-break</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((alloc) => (
                    <tr key={alloc.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{alloc.offering.course.title}</p>
                        <p className="text-xs text-slate-400">{alloc.offering.course.code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {alloc.offering.professor.user.name}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {alloc.offering.course.credits}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700">
                        {alloc.finalPoints}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {alloc.round.cycle.term.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getAllocationStatusColor(alloc.status)}`}>
                          {alloc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {alloc.tieBroken ? (
                          <span className="text-amber-600">
                            Tie-broken (rank #{alloc.tieBreakRank})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation round note */}
      {tentative.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>{tentative.length} tentative allocation(s)</strong> require confirmation during the confirmation round.
          You may also withdraw from confirmed courses during the confirmation window.
        </div>
      )}
    </div>
  );
}
