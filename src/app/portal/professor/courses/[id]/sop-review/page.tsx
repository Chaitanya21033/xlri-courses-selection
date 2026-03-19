import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCourseStatusColor } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import { SopScoreForm } from "./sop-score-form";

export default async function SopReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") redirect("/portal");

  const userId = (session.user as any)?.id as string;
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!user?.professorProfile) redirect("/auth/login");

  const offering = await db.courseOffering.findUnique({
    where: { id },
    include: {
      course: true,
      cycle: { include: { term: true } },
    },
  });

  if (!offering || offering.professorId !== user.professorProfile.id) {
    redirect("/portal/professor/courses");
  }

  if (!offering.requiresSop) {
    redirect(`/portal/professor/courses/${id}`);
  }

  // Fetch all active/pending bids with SOP content and student info
  const bids = await db.bid.findMany({
    where: {
      offeringId: id,
      status: { in: ["ACTIVE", "WINNING", "LOSING"] },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          studentProfile: {
            select: {
              rollNumber: true,
              programme: true,
              cqpi: true,
            },
          },
        },
      },
    },
    orderBy: [{ sopScore: "desc" }, { placedAt: "asc" }],
  });

  const scoredCount = bids.filter((b) => b.sopScore !== null).length;
  const unscoredCount = bids.length - scoredCount;

  const applicants = bids.map((b) => ({
    bidId: b.id,
    studentName: b.user.name,
    rollNumber: b.user.studentProfile?.rollNumber ?? null,
    programme: b.user.studentProfile?.programme ?? null,
    cqpi: b.user.studentProfile?.cqpi ?? null,
    bidStatus: b.status,
    sopText: b.sopText,
    sopSubmittedAt: b.sopSubmittedAt?.toISOString() ?? null,
    sopScore: b.sopScore,
    sopScoredAt: b.sopScoredAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href={`/portal/professor/courses/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Course
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">SOP Review</h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCourseStatusColor(
                offering.status
              )}`}
            >
              {offering.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            {offering.course.code} · {offering.course.title} · {offering.cycle.term.name}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Applicants", value: bids.length },
          { label: "Scored", value: scoredCount },
          { label: "Awaiting Score", value: unscoredCount },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning when there are unscored applicants */}
      {unscoredCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              {unscoredCount} applicant{unscoredCount !== 1 ? "s" : ""} not yet scored
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Unscored applicants are treated as score 0 and will rank last during allocation.
              Score all applicants before running allocation for best results.
            </p>
          </div>
        </div>
      )}

      {/* SOP review & scoring table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <CardTitle>Applicants & SOP Scores</CardTitle>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Read each SOP and assign a score from 0 to 100. Ranking during allocation will be
            based on these scores (highest first). Ties are broken by roll number.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <SopScoreForm offeringId={id} applicants={applicants} />
        </CardContent>
      </Card>
    </div>
  );
}
