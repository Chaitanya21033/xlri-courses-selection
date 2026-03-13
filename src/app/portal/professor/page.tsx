import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCourseStatusColor } from "@/lib/utils";
import Link from "next/link";
import { BookMarked, Users, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

export default async function ProfessorDashboard() {
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

  const prof = user.professorProfile;

  const offerings = await db.courseOffering.findMany({
    where: { professorId: prof.id },
    include: {
      course: true,
      tieBreakPolicy: true,
      _count: { select: { bids: true, allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const withoutTieBreak = offerings.filter((o) => !o.tieBreakPolicy);
  const totalBids = offerings.reduce((s, o) => s + o._count.bids, 0);
  const totalAllocations = offerings.reduce((s, o) => s + o._count.allocations, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user.name}
        </h1>
        <p className="text-slate-500 mt-1">
          {prof.department} · {prof.designation ?? "Faculty"}
        </p>
      </div>

      {/* Warning for missing tie-break */}
      {withoutTieBreak.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              Action Required: Tie-break policy not defined
            </p>
            <p className="text-amber-700 text-sm mt-0.5">
              {withoutTieBreak.length} course(s) cannot go to active bidding without a tie-break policy.
            </p>
            <Link href="/portal/professor/courses" className="text-amber-600 text-sm hover:underline mt-1 block">
              Configure now →
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">My Courses</p>
            <p className="text-2xl font-bold text-slate-900">{offerings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Bids</p>
            <p className="text-2xl font-bold text-indigo-600">{totalBids}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Allocations</p>
            <p className="text-2xl font-bold text-emerald-600">{totalAllocations}</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Course Offerings</CardTitle>
            <Link href="/portal/professor/courses" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Eligibility</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Seats</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bids</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">MRB</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tie-break</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{o.course.title}</p>
                      <p className="text-xs text-slate-400">{o.course.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={o.eligibility === "BOTH" ? "info" : o.eligibility === "BM" ? "primary" : "warning"}>
                        {o.eligibility}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{o.seatCap}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={o._count.bids > o.seatCap ? "text-red-600 font-semibold" : "text-slate-600"}>
                        {o._count.bids}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700">{o.mrb}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCourseStatusColor(o.status)}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.tieBreakPolicy ? (
                        <span className="text-xs text-emerald-600">✓ {o.tieBreakPolicy.method}</span>
                      ) : (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/portal/professor/courses/${o.id}`} className="text-xs text-indigo-600 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
