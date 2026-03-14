import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAllocationStatusColor, formatDate, formatPoints } from "@/lib/utils";
import { FileText, Trophy, BookMarked, Coins } from "lucide-react";

export default async function StudentSummaryPage() {
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

  const [allocations, bids, pointAccounts, activeCycle] = await Promise.all([
    db.allocationResult.findMany({
      where: { studentProfileId: sp.id },
      include: {
        offering: {
          include: {
            course: true,
            professor: { include: { user: true } },
            cycle: { include: { term: true } },
          },
        },
        round: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.bid.findMany({
      where: { userId },
      include: {
        offering: { include: { course: true } },
        round: { include: { cycle: { include: { term: true } } } },
      },
      orderBy: { placedAt: "desc" },
    }),
    db.pointAccount.findMany({
      where: { studentProfileId: sp.id },
      include: { cycle: { include: { term: true } } },
      orderBy: { cycle: { createdAt: "desc" } },
    }),
    db.biddingCycle.findFirst({
      where: { isActive: true },
      include: { term: true },
    }),
  ]);

  const confirmedAllocations = allocations.filter((a) => a.status === "CONFIRMED");
  const tentativeAllocations = allocations.filter((a) => a.status === "TENTATIVE");
  const withdrawnAllocations = allocations.filter((a) => a.status === "WITHDRAWN");
  const totalCredits = confirmedAllocations.reduce(
    (s, a) => s + a.offering.course.credits,
    0
  );
  const totalPointsSpent = confirmedAllocations.reduce(
    (s, a) => s + a.finalPoints,
    0
  );

  const activeBids = bids.filter((b) =>
    ["ACTIVE", "WINNING", "LOSING"].includes(b.status)
  );
  const activePointAccount = activeCycle
    ? pointAccounts.find((p) => p.cycleId === activeCycle.id)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Summary</h1>
        <p className="text-slate-500 mt-1">
          A complete view of your academic selections and bidding activity.
        </p>
      </div>

      {/* Student Info */}
      <Card className="bg-indigo-50 border-indigo-100">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-indigo-700">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span>{sp.rollNumber}</span>
                <span>·</span>
                <Badge variant={sp.programme === "BM" ? "primary" : "warning"}>
                  {sp.programme}
                </Badge>
                <span>·</span>
                <span>CQPI: {sp.cqpi.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-slate-500">Confirmed Courses</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {confirmedAllocations.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-slate-500">Total Credits</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalCredits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-indigo-500" />
              <p className="text-sm text-slate-500">Points Spent</p>
            </div>
            <p className="text-2xl font-bold text-indigo-600">
              {formatPoints(totalPointsSpent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Active Bids</p>
            </div>
            <p className="text-2xl font-bold text-slate-700">
              {activeBids.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Cycle Point Account */}
      {activePointAccount && activeCycle && (
        <Card>
          <CardHeader>
            <CardTitle>Current Cycle: {activeCycle.name}</CardTitle>
            <CardDescription>{activeCycle.term.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Points</span>
                <span className="font-bold text-slate-900">
                  {formatPoints(activePointAccount.totalPoints)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Used / Reserved</span>
                <span className="text-slate-600">
                  {formatPoints(activePointAccount.usedPoints)} /{" "}
                  {formatPoints(activePointAccount.reservedPoints)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Available</span>
                <span className="font-bold text-emerald-600">
                  {formatPoints(
                    activePointAccount.totalPoints -
                      activePointAccount.usedPoints -
                      activePointAccount.reservedPoints
                  )}
                </span>
              </div>
              <Progress
                value={Math.round(
                  ((activePointAccount.usedPoints +
                    activePointAccount.reservedPoints) /
                    activePointAccount.totalPoints) *
                    100
                )}
                className="h-2 mt-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmed Allocations */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Confirmed Course Selections ({confirmedAllocations.length})
        </h2>
        {confirmedAllocations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-400 text-sm">
              No confirmed course selections yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {confirmedAllocations.map((alloc) => (
              <Card key={alloc.id} className="border-emerald-100">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {alloc.offering.course.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {alloc.offering.course.code} ·{" "}
                        {alloc.offering.course.credits} credits
                      </p>
                    </div>
                    <Badge variant="success">Confirmed</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-400">Faculty</p>
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {alloc.offering.professor.user.name}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-indigo-400">Pts Paid</p>
                      <p className="text-sm font-bold text-indigo-700">
                        {alloc.finalPoints}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-400">Term</p>
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {alloc.offering.cycle.term.name}
                      </p>
                    </div>
                  </div>
                  {alloc.tieBroken && (
                    <p className="text-xs text-amber-600 mt-2">
                      Allocated via tie-break (rank #{alloc.tieBreakRank})
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tentative */}
      {tentativeAllocations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Tentative ({tentativeAllocations.length})
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {tentativeAllocations.map((alloc) => (
              <Card key={alloc.id} className="border-amber-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {alloc.offering.course.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {alloc.offering.course.code} ·{" "}
                        {alloc.offering.course.credits} credits ·{" "}
                        {alloc.offering.professor.user.name}
                      </p>
                    </div>
                    <Badge variant="warning">Tentative</Badge>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Confirmation required. This allocation may change during the
                    confirmation round.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Point Accounts History */}
      {pointAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Point Accounts</CardTitle>
            <CardDescription>Across all bidding cycles</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Cycle
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Used
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Reserved
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {pointAccounts.map((pa) => {
                  const balance =
                    pa.totalPoints - pa.usedPoints - pa.reservedPoints;
                  return (
                    <tr
                      key={pa.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {pa.cycle.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {pa.cycle.term.name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatPoints(pa.totalPoints)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">
                        {formatPoints(pa.usedPoints)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">
                        {formatPoints(pa.reservedPoints)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                        {formatPoints(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
