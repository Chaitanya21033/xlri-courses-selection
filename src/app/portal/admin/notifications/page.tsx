import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Bell, CheckCircle2, Users, Send } from "lucide-react";

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const adminId = (session.user as any)?.id;

  const [sentNotifications, allNotifications] = await Promise.all([
    db.notification.findMany({
      where: { sentById: adminId },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, role: true } },
        sentBy: { select: { name: true } },
      },
    }),
  ]);

  const typeColors: Record<string, string> = {
    ROUND_OPENED: "bg-emerald-100 text-emerald-700",
    ROUND_CLOSED: "bg-slate-100 text-slate-700",
    ALLOCATION_RESULT: "bg-blue-100 text-blue-700",
    CONFIRMATION_REQUIRED: "bg-amber-100 text-amber-700",
    COURSE_CANCELLED: "bg-red-100 text-red-700",
    ANNOUNCEMENT: "bg-indigo-100 text-indigo-700",
    SYSTEM: "bg-slate-100 text-slate-600",
  };

  const unread = allNotifications.filter((n) => !n.isRead).length;
  const totalByType = allNotifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-slate-500 mt-1">
          System-wide notification log and status.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Sent</p>
            <p className="text-2xl font-bold text-slate-900">{allNotifications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Unread</p>
            <p className="text-2xl font-bold text-amber-600">{unread}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Read</p>
            <p className="text-2xl font-bold text-emerald-600">
              {allNotifications.length - unread}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">By You</p>
            <p className="text-2xl font-bold text-indigo-600">{sentNotifications.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* By Type */}
      {Object.keys(totalByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(totalByType).map(([type, count]) => (
                <div
                  key={type}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    typeColors[type] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span>{type.replace(/_/g, " ")}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Notifications</CardTitle>
            <span className="text-xs text-slate-400">Most recent 100</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {allNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications have been sent yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {allNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 ${
                    !n.isRead ? "bg-blue-50/30" : ""
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {n.isRead ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Bell className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          typeColors[n.type] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {n.type.replace(/_/g, " ")}
                      </span>
                      {!n.isRead && (
                        <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {n.user.name} ({n.user.role})
                      </span>
                      {n.sentBy && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          by {n.sentBy.name}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
