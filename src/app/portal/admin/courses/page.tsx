import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCourseStatusColor, getProgrammeLabel } from "@/lib/utils";
import Link from "next/link";
import { Plus, BookMarked, AlertTriangle } from "lucide-react";
import { DeleteCourseButton } from "./delete-course-button";

export default async function AdminCoursesPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const offerings = await db.courseOffering.findMany({
    include: {
      course: true,
      professor: { include: { user: true } },
      tieBreakPolicy: true,
      _count: {
        select: { bids: true, allocations: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Offerings</h1>
          <p className="text-slate-500 mt-1">
            Manage all course offerings, eligibility, and tie-break policies.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/admin/courses/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Offering
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Course
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Faculty
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Eligibility
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Seats
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Bids
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    MRB
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Tie-Break
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {offerings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <BookMarked className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-400 text-sm">No course offerings yet.</p>
                      <Link
                        href="/portal/admin/courses/new"
                        className="mt-2 text-sm text-indigo-600 hover:underline block"
                      >
                        Create the first offering
                      </Link>
                    </td>
                  </tr>
                ) : (
                  offerings.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{o.course.title}</p>
                        <p className="text-xs text-slate-400">{o.course.code} · {o.course.credits} credits</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.professor.user.name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            o.eligibility === "BOTH"
                              ? "info"
                              : o.eligibility === "BM"
                              ? "primary"
                              : "warning"
                          }
                        >
                          {getProgrammeLabel(o.eligibility)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {o.seatCap}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            o._count.bids > o.seatCap
                              ? "font-semibold text-red-600"
                              : "text-slate-600"
                          }
                        >
                          {o._count.bids}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {o.mrb}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getCourseStatusColor(
                            o.status
                          )}`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {o.tieBreakPolicy ? (
                          <span className="text-xs text-emerald-600 font-medium">✓ Set</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Missing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/portal/admin/courses/${o.id}`}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Edit
                          </Link>
                          <DeleteCourseButton
                            offeringId={o.id}
                            courseTitle={o.course.title}
                            status={o.status}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
