import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, Clock } from "lucide-react";

export default async function AdminCyclesPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const cycles = await db.biddingCycle.findMany({
    include: {
      term: true,
      biddingRounds: {
        orderBy: { roundNumber: "asc" },
      },
      _count: {
        select: { courseOfferings: true, pointAccounts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bidding Cycles</h1>
          <p className="text-slate-500 mt-1">
            Academic terms and their associated bidding configurations.
          </p>
        </div>
        <Link href="/portal/admin/cycles/new">
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Cycle
          </Button>
        </Link>
      </div>

      {cycles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No bidding cycles yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Create a cycle to start configuring elective bidding.
            </p>
            <Link href="/portal/admin/cycles/new">
              <Button variant="primary" size="sm" className="mt-4">
                Create First Cycle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => (
            <Card key={cycle.id} className={cycle.isActive ? "ring-1 ring-indigo-200" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{cycle.name}</h3>
                      {cycle.isActive && (
                        <Badge variant="success">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{cycle.term.name}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">{cycle.totalBidPoints}</span>
                        {" "}bid points/student
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">{cycle._count.courseOfferings}</span>
                        {" "}courses
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">{cycle._count.pointAccounts}</span>
                        {" "}enrolled students
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {cycle.carryForwardEnabled && (
                        <Badge variant="info">Carry-forward enabled</Badge>
                      )}
                      {cycle.minBidRequired && (
                        <Badge variant="default">Min 1-pt bid required</Badge>
                      )}
                      {cycle.crossProgEnabled && (
                        <Badge variant="primary">Cross-programme enabled</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/portal/admin/cycles/${cycle.id}`}>
                      <Button variant="secondary" size="sm">
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/portal/admin/rounds?cycleId=${cycle.id}`}>
                      <Button variant="outline" size="sm">
                        Rounds ({cycle.biddingRounds.length})
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Rounds summary */}
                {cycle.biddingRounds.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      {cycle.biddingRounds.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs"
                        >
                          <span className="font-medium text-slate-700">
                            Round {r.roundNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              r.status === "OPEN"
                                ? "bg-green-100 text-green-700"
                                : r.status === "CLOSED"
                                ? "bg-orange-100 text-orange-700"
                                : r.status === "CONFIRMED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {r.status}
                          </span>
                          {r.isConfirmationRound && (
                            <span className="text-slate-400">· Confirmation</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
