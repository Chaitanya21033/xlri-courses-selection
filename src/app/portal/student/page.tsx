import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPoints, getAllocationStatusColor } from "@/lib/utils";
import Link from "next/link";
import {
  BookMarked,
  Trophy,
  Coins,
  Clock,
  ArrowRight,
  Bell,
} from "lucide-react";

export default async function StudentDashboard() {
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

  const [pointAccounts, activeBids, allocations, openRounds, notifications] =
    await Promise.all([
      db.pointAccount.findMany({
        where: { studentProfileId: sp.id },
        include: { cycle: { include: { term: true } } },
      }),
      db.bid.findMany({
        where: {
          userId,
          status: { in: ["ACTIVE", "WINNING", "LOSING"] },
        },
        include: {
          offering: { include: { course: true, professor: { include: { user: true } } } },
          round: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.allocationResult.findMany({
        where: { studentProfileId: sp.id },
        include: {
          offering: { include: { course: true } },
          round: { include: { cycle: { include: { term: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.biddingRound.findMany({
        where: { status: "OPEN" },
        include: { cycle: { include: { term: true } } },
        take: 3,
      }),
      db.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const activeAccount = pointAccounts.find((pa) => pa.cycle.isActive);
  const usedPct = activeAccount
    ? Math.round(
        ((activeAccount.usedPoints + activeAccount.reservedPoints) /
          activeAccount.totalPoints) *
          100
      )
    : 0;
  const availablePoints = activeAccount
    ? activeAccount.totalPoints -
      activeAccount.usedPoints -
      activeAccount.reservedPoints
    : 0;

  const winningBids = activeBids.filter((b) => b.status === "WINNING");
  const losingBids = activeBids.filter((b) => b.status === "LOSING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user.name.split(" ")[0]}
        </h1>
        <p className="text-slate-500 mt-1">
          {sp.programme} Programme · Roll No. {sp.rollNumber}
        </p>
      </div>

      {/* Active round banner */}
      {openRounds.length > 0 && (
        <div className="bg-indigo-700 text-white rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">Bidding is Open</p>
              <p className="text-indigo-200 text-sm">
                {openRounds[0].name} — {openRounds[0].cycle.term.name}
              </p>
            </div>
          </div>
          <Link href="/portal/student/bids">
            <Button variant="secondary" size="sm">
              Manage Bids <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Available Points</p>
              <Coins className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-indigo-700">
              {formatPoints(availablePoints)}
            </p>
            {activeAccount && (
              <div className="mt-2">
                <Progress value={usedPct} className="h-1" />
                <p className="text-xs text-slate-400 mt-1">
                  {formatPoints(activeAccount.usedPoints + activeAccount.reservedPoints)} of{" "}
                  {formatPoints(activeAccount.totalPoints)} used
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Active Bids</p>
              <BookMarked className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{activeBids.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Winning</p>
              <Trophy className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{winningBids.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Notifications</p>
              <Bell className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{notifications.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Current bids */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Current Bids</CardTitle>
              <Link
                href="/portal/student/bids"
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeBids.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <BookMarked className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No active bids</p>
                <Link
                  href="/portal/student/catalog"
                  className="text-sm text-indigo-600 hover:underline mt-1 block"
                >
                  Browse course catalog →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBids.slice(0, 5).map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {bid.offering.course.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {bid.offering.course.code}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-bold text-indigo-700">
                        {bid.points} pts
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          bid.status === "WINNING"
                            ? "bg-emerald-100 text-emerald-700"
                            : bid.status === "LOSING"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {bid.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent allocations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Allocations</CardTitle>
              <Link
                href="/portal/student/allocations"
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No allocations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {alloc.offering.course.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {alloc.round.cycle.term.name}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${getAllocationStatusColor(
                        alloc.status
                      )}`}
                    >
                      {alloc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Unread Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="font-medium text-sm text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
