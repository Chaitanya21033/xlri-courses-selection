import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCourseStatusColor } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProfessorCourseEditForm } from "./prof-course-edit-form";
import { TieBreakForm } from "@/app/portal/admin/courses/[id]/tiebreak-form";

export default async function ProfessorCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") redirect("/portal");

  const userId = (session.user as any)?.id;
  const { id } = await params;

  const user = await db.user.findUnique({ where: { id: userId }, include: { professorProfile: true } });
  if (!user?.professorProfile) redirect("/auth/login");

  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: {
      course: true,
      tieBreakPolicy: true,
      cycle: { include: { term: true } },
      _count: { select: { bids: true, allocations: true } },
    },
  });

  if (!offering || offering.professorId !== user.professorProfile.id) redirect("/portal/professor/courses");

  const canEdit = !["BIDDING_OPEN", "CONFIRMED"].includes(offering.status);

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/portal/professor/courses">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> My Courses</Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{offering.course.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCourseStatusColor(offering.status)}`}>
              {offering.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-slate-400 text-sm">{offering.course.code} · {offering.cycle.term.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Seats", value: offering.seatCap },
          { label: "Active Bids", value: offering._count.bids },
          { label: "Allocations", value: offering._count.allocations },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tie-break alert */}
      {!offering.tieBreakPolicy && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Tie-break policy required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Bidding cannot open for this course until a tie-break policy is defined. Set it below.
            </p>
          </div>
        </div>
      )}

      {offering.tieBreakPolicy && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Tie-break: {offering.tieBreakPolicy.method.replace(/_/g, " ")}</p>
            {offering.tieBreakPolicy.isLocked && <p className="text-xs text-emerald-600 mt-0.5">Locked — cannot be changed while bidding is open</p>}
          </div>
        </div>
      )}

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle>{canEdit ? "Edit Course Details" : "Course Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <ProfessorCourseEditForm offering={offering} />
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              {offering.course.description && <p>{offering.course.description}</p>}
              {offering.course.prerequisites && <p><strong>Prerequisites:</strong> {offering.course.prerequisites}</p>}
              {offering.course.scheduleNotes && <p><strong>Schedule:</strong> {offering.course.scheduleNotes}</p>}
              {offering.course.learningGoals && <p><strong>Learning goals:</strong> {offering.course.learningGoals}</p>}
              <p className="text-slate-400 text-xs mt-3">Course is in {offering.status} state — editing is disabled.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tie-break */}
      <Card>
        <CardHeader><CardTitle>Tie-break Policy</CardTitle></CardHeader>
        <CardContent>
          <TieBreakForm
            offeringId={id}
            apiPath={`/api/professor/courses/${id}/tiebreak`}
            existingPolicy={offering.tieBreakPolicy}
          />
        </CardContent>
      </Card>
    </div>
  );
}
