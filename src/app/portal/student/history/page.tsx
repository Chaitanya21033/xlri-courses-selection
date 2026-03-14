import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { History, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export default async function StudentBidHistoryPage() {
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

  // Fetch all bids with their history
  const bids = await db.bid.findMany({
    where: { userId },
    include: {
      offering: {
        include: {
          course: true,
          professor: { include: { user: true } },
        },
      },
      round: { include: { cycle: { include: { term: true } } } },
      history: { orderBy: { timestamp: "asc" } },
    },
    orderBy: { placedAt: "desc" },
  });

  const actionColors: Record<string, string> = {
    PLACED: "bg-blue-100 text-blue-700",
    UPDATED: "bg-amber-100 text-amber-700",
    WITHDRAWN: "bg-red-100 text-red-700",
    REIMBURSED: "bg-emerald-100 text-emerald-700",
    ALLOCATED: "bg-indigo-100 text-indigo-700",
  };

  const bidStatusColors: Record<string, string> = {
    ACTIVE: "bg-blue-100 text-blue-700",
    WINNING: "bg-emerald-100 text-emerald-700",
    LOSING: "bg-red-100 text-red-700",
    REIMBURSED: "bg-slate-100 text-slate-600",
    WITHDRAWN: "bg-slate-100 text-slate-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bid History</h1>
        <p className="text-slate-500 mt-1">
          Complete history of all your bid placements, adjustments, and outcomes.
        </p>
      </div>

      {bids.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <History className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No bid history yet. Place bids during an open round to see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => (
            <Card key={bid.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {bid.offering.course.title}
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {bid.offering.course.code} · {bid.round.name} ·{" "}
                      {bid.round.cycle.term.name} · Prof.{" "}
                      {bid.offering.professor.user.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        bidStatusColors[bid.status] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {bid.status}
                    </span>
                    <span className="font-bold text-indigo-700 text-sm">
                      {bid.points} pts
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {bid.history.length === 0 ? (
                  <p className="text-xs text-slate-400">No history entries.</p>
                ) : (
                  <div className="relative">
                    {/* Timeline */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
                    <div className="space-y-3 pl-8">
                      {bid.history.map((h, idx) => {
                        const prev = idx > 0 ? bid.history[idx - 1] : null;
                        const delta = prev ? h.points - prev.points : null;
                        return (
                          <div key={h.id} className="relative">
                            <div className="absolute -left-8 mt-1 h-4 w-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                              {delta === null || delta === 0 ? (
                                <Minus className="h-2 w-2 text-slate-400" />
                              ) : delta > 0 ? (
                                <ArrowUpRight className="h-2 w-2 text-emerald-500" />
                              ) : (
                                <ArrowDownRight className="h-2 w-2 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    actionColors[h.action] ??
                                    "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {h.action}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {formatDate(h.timestamp)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-mono font-bold text-slate-700">
                                  {h.points} pts
                                </span>
                                {delta !== null && delta !== 0 && (
                                  <span
                                    className={`text-xs font-semibold ${
                                      delta > 0
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {delta > 0 ? "+" : ""}
                                    {delta}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
