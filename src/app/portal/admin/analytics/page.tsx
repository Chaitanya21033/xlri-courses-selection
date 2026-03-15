import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, Users, BookOpen, BarChart3, Download } from "lucide-react";
import Link from "next/link";
import { CancelCourseButton } from "./cancel-course-button";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  // Course demand with bid programme breakdown
  const offerings = await db.courseOffering.findMany({
    include: {
      course: true,
      professor: { include: { user: true } },
      bids: {
        where: { status: { in: ["ACTIVE", "WINNING"] } },
        include: {
          user: { include: { studentProfile: { select: { programme: true } } } },
        },
      },
      allocations: true,
      _count: { select: { bids: true, allocations: true } },
    },
    orderBy: { mrb: "desc" },
  });

  // Point account stats
  const pointAccounts = await db.pointAccount.findMany({
    include: { cycle: { select: { name: true } } },
  });

  // Student stats
  const studentCount = await db.studentProfile.count({ where: { isActive: true } });
  const bmCount = await db.studentProfile.count({ where: { programme: "BM", isActive: true } });
  const hrmCount = await db.studentProfile.count({ where: { programme: "HRM", isActive: true } });

  // Active bidding cycle
  const activeCycle = await db.biddingCycle.findFirst({
    where: { isActive: true },
    include: { biddingRounds: { orderBy: { roundNumber: "asc" } } },
  });

  const totalBids = offerings.reduce((sum, o) => sum + o._count.bids, 0);
  const totalSeats = offerings.reduce((sum, o) => sum + o.seatCap, 0);
  const oversubscribed = offerings.filter((o) => o._count.bids > o.seatCap);
  const undersubscribed = offerings.filter(
    (o) => o._count.bids < o.seatCap && o._count.bids > 0
  );
  const noBids = offerings.filter((o) => o._count.bids === 0 && o.status !== "CANCELLED");
  const fillRate =
    totalSeats > 0 ? Math.round((Math.min(totalBids, totalSeats) / totalSeats) * 100) : 0;

  const totalPointsIssued = pointAccounts.reduce((s, p) => s + p.totalPoints, 0);
  const totalPointsUsed = pointAccounts.reduce((s, p) => s + p.usedPoints + p.reservedPoints, 0);
  const pointUtilisation =
    totalPointsIssued > 0 ? Math.round((totalPointsUsed / totalPointsIssued) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demand Analytics</h1>
          <p className="text-slate-500 mt-1">
            Real-time view of course demand, oversubscription, seat utilization, and programme split.
          </p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> Total Bids
            </p>
            <p className="text-2xl font-bold text-slate-900">{totalBids.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 mb-1">Seat Fill Rate</p>
            <p className="text-2xl font-bold text-indigo-600">{fillRate}%</p>
            <p className="text-xs text-slate-400">{totalSeats} total seats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-red-500" /> Oversubscribed
            </p>
            <p className="text-2xl font-bold text-red-600">{oversubscribed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-amber-500" /> Undersubscribed
            </p>
            <p className="text-2xl font-bold text-amber-600">{undersubscribed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5 text-violet-500" /> Point Utilisation
            </p>
            <p className="text-2xl font-bold text-violet-700">{pointUtilisation}%</p>
            <p className="text-xs text-slate-400">of all issued points</p>
          </CardContent>
        </Card>
      </div>

      {/* Student cohort summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Student Cohort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Total Active</p>
              <p className="text-xl font-bold text-slate-900">{studentCount}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">BM</p>
              <p className="text-xl font-bold text-blue-700">{bmCount}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">HRM</p>
              <p className="text-xl font-bold text-amber-700">{hrmCount}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Points Issued</p>
              <p className="text-xl font-bold text-slate-700">{totalPointsIssued.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Points Reserved</p>
              <p className="text-xl font-bold text-slate-700">{totalPointsUsed.toLocaleString()}</p>
            </div>
          </div>

          {/* Point utilisation bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Point utilisation</span>
              <span>{pointUtilisation}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  pointUtilisation > 80 ? "bg-red-500" : pointUtilisation > 50 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(pointUtilisation, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course demand table with programme split */}
      <Card>
        <CardHeader>
          <CardTitle>Course Demand Overview</CardTitle>
          <CardDescription>
            Sorted by MRB (clearing price) descending — highest demand courses at top.
            BM / HRM split shows bidder composition.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Faculty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Eligibility</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bids</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BM</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">HRM</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Seats</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">MRB</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fill</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => {
                  const ratio = o.seatCap > 0 ? o._count.bids / o.seatCap : 0;
                  const bmBids = o.bids.filter(
                    (b) => b.user.studentProfile?.programme === "BM"
                  ).length;
                  const hrmBids = o.bids.filter(
                    (b) => b.user.studentProfile?.programme === "HRM"
                  ).length;
                  return (
                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{o.course.title}</p>
                        <p className="text-xs text-slate-400">{o.course.code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{o.professor.user.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={o.eligibility === "BOTH" ? "info" : o.eligibility === "BM" ? "primary" : "warning"}>
                          {o.eligibility}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{o._count.bids}</td>
                      <td className="px-4 py-3 text-right text-blue-700 font-medium text-xs">{bmBids}</td>
                      <td className="px-4 py-3 text-right text-amber-700 font-medium text-xs">{hrmBids}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{o.seatCap}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700">{o.mrb}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                ratio > 1.5 ? "bg-red-500" : ratio > 1 ? "bg-amber-400" : "bg-emerald-400"
                              }`}
                              style={{ width: `${Math.min(ratio * 50, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 w-8">{ratio.toFixed(1)}x</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {o.status === "CANCELLED" ? (
                          <span className="text-xs text-red-400 font-medium">Cancelled</span>
                        ) : o._count.bids === 0 ? (
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No bids
                          </span>
                        ) : ratio > 1.5 ? (
                          <span className="text-xs text-red-600 font-medium">High demand</span>
                        ) : ratio > 1 ? (
                          <span className="text-xs text-amber-600 font-medium">Oversubscribed</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Available seats</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk alerts — courses with no bids, with cancel option */}
      {noBids.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Courses at Risk — No Bids
            </CardTitle>
            <CardDescription>
              These courses have received no bids. Consider cancelling to free up admin resources
              and notify students to redistribute bid points.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {noBids.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div>
                    <p className="font-medium text-slate-800">{o.course.title}</p>
                    <p className="text-xs text-slate-500">
                      {o.professor.user.name} · {o.eligibility} · {o.seatCap} seats
                    </p>
                  </div>
                  <CancelCourseButton offeringId={o.id} courseCode={o.course.code} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seat utilization breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Seat Utilization Breakdown</CardTitle>
          <CardDescription>Per-course seat fill percentage across all active offerings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {offerings
              .filter((o) => o.status !== "CANCELLED")
              .sort((a, b) => {
                const ra = a._count.bids / a.seatCap;
                const rb = b._count.bids / b.seatCap;
                return rb - ra;
              })
              .map((o) => {
                const pct = Math.min(Math.round((o._count.bids / o.seatCap) * 100), 200);
                return (
                  <div key={o.id}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="font-medium">{o.course.code}</span>
                      <span>
                        {o._count.bids} bids / {o.seatCap} seats ({Math.round((o._count.bids / o.seatCap) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          pct > 150 ? "bg-red-500" : pct > 100 ? "bg-amber-400" : pct > 60 ? "bg-emerald-400" : "bg-blue-300"
                        }`}
                        style={{ width: `${Math.min(pct / 2, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
