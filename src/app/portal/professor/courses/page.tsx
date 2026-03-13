import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default async function ProfessorCoursesPage() {
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
      tieBreakPolicy: true,
      _count: { select: { bids: true, allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
        <p className="text-slate-500 mt-1">
          Manage course details, eligibility, and tie-break policies.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {offerings.map((o) => (
          <Card key={o.id} className={!o.tieBreakPolicy ? "border-amber-200" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{o.course.title}</h3>
                  <p className="text-xs text-slate-400">{o.course.code} · {o.course.credits} credits</p>
                </div>
                <Badge variant={o.eligibility === "BOTH" ? "info" : o.eligibility === "BM" ? "primary" : "warning"}>
                  {o.eligibility}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-400">Seats</p>
                  <p className="font-bold text-slate-700">{o.seatCap}</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-400">Bids</p>
                  <p className={`font-bold ${o._count.bids > o.seatCap ? "text-red-600" : "text-slate-700"}`}>
                    {o._count.bids}
                  </p>
                </div>
                <div className="text-center p-2 bg-indigo-50 rounded-lg">
                  <p className="text-xs text-indigo-400">MRB</p>
                  <p className="font-bold text-indigo-700">{o.mrb}</p>
                </div>
              </div>

              {!o.tieBreakPolicy && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No tie-break policy defined. Required before bidding opens.
                </div>
              )}

              {o.tieBreakPolicy && (
                <div className="text-xs text-slate-500 mb-3">
                  Tie-break: <span className="font-medium text-slate-700">{o.tieBreakPolicy.method.replace("_", " ")}</span>
                  {o.tieBreakPolicy.isLocked && (
                    <span className="ml-2 text-slate-400">(locked)</span>
                  )}
                </div>
              )}

              <Link href={`/portal/professor/courses/${o.id}`}>
                <span className="text-xs text-indigo-600 hover:underline">
                  {o.tieBreakPolicy ? "Edit course details" : "Configure tie-break policy →"}
                </span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
