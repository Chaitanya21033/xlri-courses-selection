import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  // Get demand analytics by offering
  const offeringDemand = await db.courseOffering.findMany({
    include: {
      course: true,
      professor: { include: { user: true } },
      _count: { select: { bids: true, allocations: true } },
    },
    orderBy: { mrb: "desc" },
  });

  const totalBids = offeringDemand.reduce((sum, o) => sum + o._count.bids, 0);
  const totalSeats = offeringDemand.reduce((sum, o) => sum + o.seatCap, 0);
  const oversubscribed = offeringDemand.filter((o) => o._count.bids > o.seatCap);
  const undersubscribed = offeringDemand.filter(
    (o) => o._count.bids < o.seatCap && o._count.bids > 0
  );
  const noBids = offeringDemand.filter((o) => o._count.bids === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Demand Analytics</h1>
        <p className="text-slate-500 mt-1">
          Real-time view of course demand, oversubscription, and seat utilization.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 mb-1">Total Bids</p>
            <p className="text-2xl font-bold text-slate-900">{totalBids.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 mb-1">Total Seats</p>
            <p className="text-2xl font-bold text-slate-900">{totalSeats.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 mb-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
              Oversubscribed
            </p>
            <p className="text-2xl font-bold text-red-600">{oversubscribed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 mb-1 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
              Undersubscribed
            </p>
            <p className="text-2xl font-bold text-amber-600">{undersubscribed.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Course demand table */}
      <Card>
        <CardHeader>
          <CardTitle>Course Demand Overview</CardTitle>
          <CardDescription>
            Sorted by MRB (clearing price) descending — highest demand courses at top
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Seats</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">MRB</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Demand Ratio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Signal</th>
                </tr>
              </thead>
              <tbody>
                {offeringDemand.map((o) => {
                  const ratio = o.seatCap > 0 ? o._count.bids / o.seatCap : 0;
                  return (
                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{o.course.title}</p>
                        <p className="text-xs text-slate-400">{o.course.code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {o.professor.user.name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={o.eligibility === "BOTH" ? "info" : o.eligibility === "BM" ? "primary" : "warning"}>
                          {o.eligibility}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {o._count.bids}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{o.seatCap}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700">
                        {o.mrb}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                ratio > 1.5
                                  ? "bg-red-500"
                                  : ratio > 1
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                              }`}
                              style={{ width: `${Math.min(ratio * 50, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 w-8 text-right">
                            {ratio.toFixed(1)}x
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {o._count.bids === 0 ? (
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No bids
                          </span>
                        ) : ratio > 1.5 ? (
                          <span className="text-xs text-red-600 font-medium">High demand</span>
                        ) : ratio > 1 ? (
                          <span className="text-xs text-amber-600 font-medium">Oversubscribed</span>
                        ) : ratio === 1 ? (
                          <span className="text-xs text-blue-600 font-medium">Exact fill</span>
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

      {/* Risk alerts */}
      {noBids.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Courses at Risk of Cancellation
            </CardTitle>
            <CardDescription>
              These courses have received no bids and may not meet minimum enrollment thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {noBids.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <p className="font-medium text-slate-800">{o.course.title}</p>
                    <p className="text-xs text-slate-500">{o.professor.user.name} · {o.eligibility}</p>
                  </div>
                  <Badge variant="warning">0 bids · {o.seatCap} seats</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
