import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Award } from "lucide-react";
import { getProgrammeLabel } from "@/lib/utils";

export default async function ProfessorDemandPage() {
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
      bids: {
        include: {
          user: {
            include: { studentProfile: true },
          },
        },
      },
      _count: { select: { bids: true, allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Demand Analytics</h1>
        <p className="text-slate-500 mt-1">
          Bidding demand and point distribution across your courses.
        </p>
      </div>

      {offerings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No course offerings found.</p>
          </CardContent>
        </Card>
      ) : (
        offerings.map((o) => {
          const activeBids = o.bids.filter((b) =>
            ["ACTIVE", "WINNING", "LOSING"].includes(b.status)
          );
          const totalPoints = activeBids.reduce((s, b) => s + b.points, 0);
          const avgPoints =
            activeBids.length > 0
              ? Math.round(totalPoints / activeBids.length)
              : 0;
          const maxBid =
            activeBids.length > 0
              ? Math.max(...activeBids.map((b) => b.points))
              : 0;
          const minBid =
            activeBids.length > 0
              ? Math.min(...activeBids.map((b) => b.points))
              : 0;
          const oversubscribed = activeBids.length > o.seatCap;

          // Programme breakdown
          const bmBids = activeBids.filter(
            (b) => b.user.studentProfile?.programme === "BM"
          ).length;
          const hrmBids = activeBids.filter(
            (b) => b.user.studentProfile?.programme === "HRM"
          ).length;

          // Points histogram (simplified buckets)
          const buckets: Record<string, number> = {};
          if (activeBids.length > 0) {
            const range = maxBid - minBid || 1;
            const bucketSize = Math.max(10, Math.ceil(range / 5));
            activeBids.forEach((b) => {
              const bucket =
                Math.floor((b.points - minBid) / bucketSize) * bucketSize + minBid;
              const key = `${bucket}`;
              buckets[key] = (buckets[key] ?? 0) + 1;
            });
          }

          return (
            <Card key={o.id} className={oversubscribed ? "border-red-200" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{o.course.title}</CardTitle>
                    <CardDescription>
                      {o.course.code} · {o.cycle.term.name} ·{" "}
                      {getProgrammeLabel(o.eligibility)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {oversubscribed ? (
                      <Badge variant="destructive">Oversubscribed</Badge>
                    ) : activeBids.length >= o.seatCap * 0.8 ? (
                      <Badge variant="warning">High Demand</Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Key stats */}
                {/* Key stats — bid points hidden from professors */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-400">Seats</p>
                    <p className="text-xl font-bold text-slate-700">{o.seatCap}</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${oversubscribed ? "bg-red-50" : "bg-indigo-50"}`}>
                    <p className={`text-xs ${oversubscribed ? "text-red-400" : "text-indigo-400"}`}>Active Bids</p>
                    <p className={`text-xl font-bold ${oversubscribed ? "text-red-700" : "text-indigo-700"}`}>
                      {activeBids.length}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-400">MRB</p>
                    <p className="text-xl font-bold text-slate-700">{o.mrb}</p>
                  </div>
                </div>

                {activeBids.length > 0 && (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Programme split */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Programme Split
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: "BM", count: bmBids, color: "bg-blue-500" },
                          { label: "HRM", count: hrmBids, color: "bg-purple-500" },
                        ].map(({ label, count, color }) => {
                          const pct =
                            activeBids.length > 0
                              ? Math.round((count / activeBids.length) * 100)
                              : 0;
                          return (
                            <div key={label}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700">{label}</span>
                                <span className="text-sm text-slate-500">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${color} rounded-full`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bidders list — points hidden from professors */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Bidding Students
                      </p>
                      <div className="space-y-1.5">
                        {activeBids
                          .slice(0, 10)
                          .map((bid, idx) => (
                            <div
                              key={bid.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                  {idx + 1}
                                </span>
                                <span className="text-slate-700">
                                  {bid.user.studentProfile?.rollNumber ?? bid.user.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {bid.user.studentProfile?.programme}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 italic">
                        Individual bid points are not visible to faculty.
                      </p>
                    </div>
                  </div>
                )}

                {activeBids.length === 0 && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                    <Users className="h-4 w-4" />
                    No active bids yet for this course.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
