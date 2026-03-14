import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCourseStatusColor, getProgrammeLabel } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CourseOfferingEditForm } from "./course-edit-form";
import { TieBreakForm } from "./tiebreak-form";

export default async function CourseOfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/portal");

  const { id } = await params;

  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: {
      course: true,
      professor: { include: { user: true } },
      tieBreakPolicy: true,
      cycle: { include: { term: true } },
      _count: { select: { bids: true, allocations: true } },
    },
  });

  if (!offering) redirect("/portal/admin/courses");

  const canEdit = !["BIDDING_OPEN", "CONFIRMED"].includes(offering.status);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/courses">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Courses</Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{offering.course.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCourseStatusColor(offering.status)}`}>
              {offering.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-slate-400 text-sm">{offering.course.code} · {offering.cycle.term.name} · {offering.professor.user.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Seats", value: offering.seatCap },
          { label: "Bids", value: offering._count.bids },
          { label: "Allocations", value: offering._count.allocations },
          { label: "MRB", value: offering.mrb },
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
            <p className="font-semibold text-amber-800">Tie-break policy not configured</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This course cannot enter an active bidding round without a tie-break policy. Configure it below.
            </p>
          </div>
        </div>
      )}

      {offering.tieBreakPolicy && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Tie-break policy: {offering.tieBreakPolicy.method.replace(/_/g, " ")}</p>
            {offering.tieBreakPolicy.isLocked && <p className="text-xs text-emerald-600 mt-0.5">Locked — cannot be changed</p>}
          </div>
        </div>
      )}

      {/* Edit form */}
      {canEdit ? (
        <Card>
          <CardHeader><CardTitle>Edit Offering</CardTitle></CardHeader>
          <CardContent>
            <CourseOfferingEditForm offering={offering} />
          </CardContent>
        </Card>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
          This offering is in <strong>{offering.status}</strong> status and cannot be edited.
        </div>
      )}

      {/* Tie-break form */}
      <Card>
        <CardHeader>
          <CardTitle>Tie-break Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <TieBreakForm
            offeringId={id}
            apiPath={`/api/admin/courses/${id}/tiebreak`}
            existingPolicy={offering.tieBreakPolicy}
          />
        </CardContent>
      </Card>
    </div>
  );
}
