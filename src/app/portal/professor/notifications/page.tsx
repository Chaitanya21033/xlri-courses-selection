import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Bell, CheckCircle2 } from "lucide-react";

export default async function ProfessorNotificationsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    redirect("/portal");
  }

  const userId = (session.user as any)?.id;

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  const typeColors: Record<string, string> = {
    ROUND_OPENED: "bg-emerald-100 text-emerald-700",
    ROUND_CLOSED: "bg-slate-100 text-slate-700",
    ALLOCATION_RESULT: "bg-blue-100 text-blue-700",
    CONFIRMATION_REQUIRED: "bg-amber-100 text-amber-700",
    COURSE_CANCELLED: "bg-red-100 text-red-700",
    ANNOUNCEMENT: "bg-indigo-100 text-indigo-700",
    SYSTEM: "bg-slate-100 text-slate-600",
  };

  function NotificationItem({ n }: { n: (typeof notifications)[0] }) {
    return (
      <div
        className={`flex items-start gap-4 px-5 py-4 ${
          !n.isRead ? "bg-blue-50/40" : ""
        }`}
      >
        <div className="mt-0.5 flex-shrink-0">
          {n.isRead ? (
            <CheckCircle2 className="h-4 w-4 text-slate-300" />
          ) : (
            <Bell className="h-4 w-4 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                typeColors[n.type] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {n.type.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800">{n.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
          {n.link && (
            <a
              href={n.link}
              className="text-xs text-indigo-600 hover:underline mt-1 block"
            >
              View →
            </a>
          )}
          <p className="text-xs text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">
            Updates about your courses, rounds, and allocations.
          </p>
        </div>
        {unread.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-semibold">
            <Bell className="h-3.5 w-3.5" />
            {unread.length} unread
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {unread.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Unread ({unread.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {unread.map((n) => (
                    <NotificationItem key={n.id} n={n} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {read.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-slate-500">
                  Earlier ({read.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {read.map((n) => (
                    <NotificationItem key={n.id} n={n} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
