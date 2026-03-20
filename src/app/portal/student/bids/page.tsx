import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPoints } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StudentBidsPage() {
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

  const activeCycle = await db.biddingCycle.findFirst({
    where: { isActive: true },
    include: {
      biddingRounds: { orderBy: { roundNumber: "asc" } },
    },
  });

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
    },
    orderBy: { updatedAt: "desc" },
  });

  const pointAccount = activeCycle
    ? await db.pointAccount.findUnique({
        where: {
          studentProfileId_cycleId: {
            studentProfileId: sp.id,
            cycleId: activeCycle.id,
          },
        },
      })
    : null;

  const activeBids = bids.filter((b) =>
    ["ACTIVE", "WINNING", "LOSING"].includes(b.status)
  );
  const totalActivePoints = activeBids.reduce((sum, b) => sum + b.points, 0);
  const usedPct = pointAccount
    ? Math.round((totalActivePoints / pointAccount.totalPoints) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Bids</h1>
        <p className="text-slate-500 mt-1">
          All active bid positions and point allocations.
        </p>
      </div>

      {/* Points summary */}
      {pointAccount && (
        <Card className="bg-indigo-50 border-indigo-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-indigo-800">
                  Point Account · {activeCycle?.name}
                </p>
                <p className="text-xs text-indigo-500">
                  {formatPoints(pointAccount.totalPoints)} total allocated
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-700">
                  {formatPoints(
                    pointAccount.totalPoints -
                      pointAccount.usedPoints -
                      pointAccount.reservedPoints
                  )}
                </p>
                <p className="text-xs text-indigo-500">available</p>
              </div>
            </div>
            <Progress value={usedPct} className="h-2" />
            <div className="flex justify-between text-xs text-indigo-400 mt-1">
              <span>Deployed: {formatPoints(totalActivePoints)} pts</span>
              <span>{usedPct}% committed</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active bids */}
      <Card>
        <CardHeader>
          <CardTitle>Active Bids ({activeBids.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Round</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Bid</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeBids.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No active bids.{" "}
                      <Link href="/portal/student/catalog" className="text-indigo-600 hover:underline">
                        Browse courses
                      </Link>
                    </td>
                  </tr>
                ) : (
                  activeBids.map((bid) => (
                    <tr key={bid.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{bid.offering.course.title}</p>
                        <p className="text-xs text-slate-400">{bid.offering.course.code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {bid.round.name}
                        <p className="text-slate-400">{bid.round.cycle.term.name}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-indigo-700">{bid.points}</span>
                        <span className="text-slate-400 text-xs"> pts</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            bid.status === "WINNING"
                              ? "bg-emerald-100 text-emerald-700"
                              : bid.status === "LOSING"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {bid.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bid rules reminder */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-700 mb-2 text-sm">Bidding Rules</h3>
          <ul className="space-y-1 text-xs text-slate-500">
            <li>• You can withdraw from a <strong>losing</strong> course at any time — points are reimbursed.</li>
            <li>• You can withdraw from a <strong>winning</strong> course only if your bid is at 0 pts.</li>
            <li>• Post-round confirmation: you may withdraw confirmed allocations during the confirmation round.</li>
            <li>• All actions are logged in the audit trail.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
