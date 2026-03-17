import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, BookMarked, Plus } from "lucide-react";
import { DeleteOfferingButton, DeleteStandaloneCourseButton } from "./delete-course-button";

const ELIGIBILITY_LABELS: Record<string, string> = {
  BM: "BM only",
  HRM: "HRM only",
  GMP: "GMP only",
  BM_HRM: "BM + HRM",
  BM_GMP: "BM + GMP",
  HRM_GMP: "HRM + GMP",
  ALL: "All programmes",
  BOTH: "BM + HRM", // legacy
};

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

  const profId = user.professorProfile.id;

  // CourseOfferings — linked to a cycle (admin-assigned)
  const offerings = await db.courseOffering.findMany({
    where: { professorId: profId },
    include: {
      course: true,
      cycle: { include: { term: true } },
      tieBreakPolicy: true,
      _count: { select: { bids: true, allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Standalone courses — created by this professor, not yet in any offering
  const offeringCourseIds = offerings.map((o) => o.courseId);
  const standaloneCourses = await db.course.findMany({
    where: {
      createdByProfessorId: profId,
      id: { notIn: offeringCourseIds.length > 0 ? offeringCourseIds : ["__none__"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-slate-500 mt-1">
            Manage your course proposals and bidding offerings.
          </p>
        </div>
        <Link href="/portal/professor/courses/new">
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-1.5" /> Propose New Course
          </Button>
        </Link>
      </div>

      {/* Standalone course proposals */}
      {standaloneCourses.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Course Proposals</h2>
            <p className="text-sm text-slate-400">
              Awaiting admin assignment to a bidding cycle.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {standaloneCourses.map((c) => (
              <Card key={c.id} className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-slate-900">{c.title}</h3>
                        <p className="text-xs text-slate-400">
                          {c.code} · {c.credits} credits
                          {c.termNumber ? ` · Term ${c.termNumber}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {c.defaultEligibility && (
                      <span className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                        {ELIGIBILITY_LABELS[c.defaultEligibility] ?? c.defaultEligibility}
                      </span>
                    )}
                    {c.defaultSeatCap && (
                      <span className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                        {c.defaultSeatCap} seats
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-amber-600">
                      Admin will link this to an active bidding cycle.
                    </p>
                    <DeleteStandaloneCourseButton courseId={c.id} courseTitle={c.title} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Active course offerings */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Active Offerings</h2>
          <p className="text-sm text-slate-400">
            Courses linked to a bidding cycle.
          </p>
        </div>

        {offerings.length === 0 && standaloneCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookMarked className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No courses yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Propose a new course to get started. Admin will assign it to a bidding cycle.
              </p>
              <Link href="/portal/professor/courses/new">
                <Button variant="primary" className="mt-4">
                  <Plus className="h-4 w-4 mr-1.5" /> Propose New Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : offerings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-400 text-sm">
              No offerings yet. Admin will link your proposals to a bidding cycle.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {offerings.map((o) => (
              <Card key={o.id} className={!o.tieBreakPolicy ? "border-amber-200" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{o.course.title}</h3>
                      <p className="text-xs text-slate-400">
                        {o.course.code} · {o.course.credits} credits
                      </p>
                      {o.cycle && (
                        <p className="text-xs text-indigo-500 mt-0.5">
                          {o.cycle.name} · {o.cycle.term.name}
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      o.eligibility === "ALL" || o.eligibility === "BOTH" ? "info" :
                      o.eligibility === "BM" ? "primary" : "warning"
                    }>
                      {ELIGIBILITY_LABELS[o.eligibility] ?? o.eligibility}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-400">Seats</p>
                      <p className="font-bold text-slate-700">{o.seatCap}</p>
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
                      Tie-break:{" "}
                      <span className="font-medium text-slate-700">
                        {o.tieBreakPolicy.method.replace(/_/g, " ")}
                      </span>
                      {o.tieBreakPolicy.isLocked && (
                        <span className="ml-2 text-slate-400">(locked)</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Link href={`/portal/professor/courses/${o.id}`}>
                      <span className="text-xs text-indigo-600 hover:underline">
                        {o.tieBreakPolicy ? "Edit course details" : "Configure tie-break policy →"}
                      </span>
                    </Link>
                    <DeleteOfferingButton offeringId={o.id} courseTitle={o.course.title} status={o.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
