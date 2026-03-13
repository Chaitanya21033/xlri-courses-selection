import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Users,
  BookMarked,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const [
    totalStudents,
    totalProfessors,
    totalCourses,
    activeCycles,
    openRounds,
    recentAuditLogs,
    courseStatusCounts,
  ] = await Promise.all([
    db.studentProfile.count({ where: { isActive: true } }),
    db.professorProfile.count({ where: { isActive: true } }),
    db.course.count({ where: { isActive: true } }),
    db.biddingCycle.findMany({
      where: { isActive: true },
      include: {
        term: true,
        biddingRounds: { where: { status: "OPEN" } },
      },
      take: 3,
    }),
    db.biddingRound.count({ where: { status: "OPEN" } }),
    db.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
    db.courseOffering.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const statusMap = Object.fromEntries(
    courseStatusCounts.map((s) => [s.status, s._count.id])
  );

  const stats = [
    {
      label: "Active Students",
      value: totalStudents,
      icon: Users,
      color: "bg-blue-50 text-blue-700",
      iconColor: "text-blue-500",
    },
    {
      label: "Faculty",
      value: totalProfessors,
      icon: Users,
      color: "bg-indigo-50 text-indigo-700",
      iconColor: "text-indigo-500",
    },
    {
      label: "Active Courses",
      value: totalCourses,
      icon: BookMarked,
      color: "bg-emerald-50 text-emerald-700",
      iconColor: "text-emerald-500",
    },
    {
      label: "Open Rounds",
      value: openRounds,
      icon: Clock,
      color: "bg-amber-50 text-amber-700",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Overview of the bidding platform status and activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Cycles */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Bidding Cycles</CardTitle>
                <Link
                  href="/portal/admin/cycles"
                  className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeCycles.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active bidding cycles</p>
                  <Link
                    href="/portal/admin/cycles/new"
                    className="mt-2 text-sm text-indigo-600 hover:underline block"
                  >
                    Create a new cycle
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{cycle.name}</p>
                        <p className="text-sm text-slate-500">
                          {cycle.term.name} · {cycle.totalBidPoints} points
                        </p>
                      </div>
                      <div className="text-right">
                        {cycle.biddingRounds.length > 0 ? (
                          <Badge variant="success">
                            {cycle.biddingRounds.length} round(s) open
                          </Badge>
                        ) : (
                          <Badge variant="warning">No open rounds</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Course Status Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Course Status</CardTitle>
              <CardDescription>Across all active cycles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { key: "BIDDING_OPEN", label: "Bidding Open", color: "text-green-600" },
                  { key: "PUBLISHED", label: "Published", color: "text-blue-600" },
                  { key: "DRAFT", label: "Draft", color: "text-slate-400" },
                  { key: "BIDDING_CLOSED", label: "Closed", color: "text-orange-600" },
                  { key: "CONFIRMED", label: "Confirmed", color: "text-emerald-600" },
                  { key: "CANCELLED", label: "Cancelled", color: "text-red-500" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${item.color}`}>
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {statusMap[item.key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CoursesWithoutTieBreak />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link
                href="/portal/admin/audit"
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
              >
                Full log <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAuditLogs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No recent activity
                </p>
              ) : (
                recentAuditLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-0.5 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600">
                        <span className="font-medium">{log.user?.name ?? "System"}</span>{" "}
                        {log.action.replace(/_/g, " ").toLowerCase()}{" "}
                        <span className="text-slate-400">{log.entityType}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function CoursesWithoutTieBreak() {
  const offeringsWithoutTieBreak = await db.courseOffering.findMany({
    where: {
      status: { in: ["PUBLISHED", "DRAFT"] },
      tieBreakPolicy: null,
    },
    include: { course: true },
    take: 5,
  });

  if (offeringsWithoutTieBreak.length === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        <p className="text-sm">All courses have tie-break policies defined.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-amber-700 font-medium mb-3">
        {offeringsWithoutTieBreak.length} course(s) missing tie-break policy
      </p>
      {offeringsWithoutTieBreak.map((o) => (
        <div
          key={o.id}
          className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-100"
        >
          <div>
            <p className="text-sm font-medium text-slate-800">{o.course.title}</p>
            <p className="text-xs text-slate-500">{o.course.code}</p>
          </div>
          <Link
            href={`/portal/admin/courses/${o.id}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            Configure →
          </Link>
        </div>
      ))}
    </div>
  );
}
