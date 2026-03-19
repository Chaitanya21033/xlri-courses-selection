import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCourseStatusColor, getProgrammeLabel } from "@/lib/utils";
import { CourseCard } from "./course-card";

export default async function StudentCatalogPage() {
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

  // Get active cycle
  const activeCycle = await db.biddingCycle.findFirst({
    where: { isActive: true },
    include: {
      biddingRounds: { where: { status: "OPEN" }, orderBy: { roundNumber: "asc" } },
    },
  });

  // Get eligible offerings (include SOP fields so course card can show SOP textarea)
  const offerings = await db.courseOffering.findMany({
    where: {
      status: { in: ["PUBLISHED", "BIDDING_OPEN"] },
      eligibility: { in: [sp.programme, "BOTH"] },
    },
    include: {
      course: true,
      professor: { include: { user: true } },
      tieBreakPolicy: { select: { method: true } },
      _count: { select: { bids: true } },
    },
    orderBy: [{ course: { title: "asc" } }],
  });

  // Get student's existing bids (include SOP fields for SOP-based courses)
  const existingBids = await db.bid.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "WINNING", "LOSING"] },
    },
    select: { offeringId: true, points: true, status: true, sopText: true, sopScore: true },
  });

  const bidMap = new Map(existingBids.map((b) => [b.offeringId, b]));

  // Point account
  const pointAccount = activeCycle
    ? await db.pointAccount.findUnique({
        where: {
          studentProfileId_cycleId: {
            studentProfileId: sp.id,
            cycleId: activeCycle.id,
          },
        },
      })
    : null;

  const activeRoundId = activeCycle?.biddingRounds[0]?.id;
  const isRoundOpen = (activeCycle?.biddingRounds.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Course Catalog</h1>
        <p className="text-slate-500 mt-1">
          Showing eligible courses for your programme ({sp.programme}).
        </p>
      </div>

      {!isRoundOpen && (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          <strong>Bidding is currently closed.</strong> You can browse courses but cannot place bids until a round is opened.
        </div>
      )}

      {pointAccount && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-800">Your Bid Point Balance</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Used: {pointAccount.usedPoints} · Reserved: {pointAccount.reservedPoints}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-700">
              {pointAccount.totalPoints - pointAccount.usedPoints - pointAccount.reservedPoints}
            </p>
            <p className="text-xs text-indigo-500">available points</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {offerings.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400">
            <p>No eligible courses available for your programme right now.</p>
          </div>
        ) : (
          offerings.map((offering) => (
            <CourseCard
              key={offering.id}
              offering={offering}
              existingBid={bidMap.get(offering.id)}
              isRoundOpen={isRoundOpen}
              activeRoundId={activeRoundId}
              availablePoints={
                pointAccount
                  ? pointAccount.totalPoints -
                    pointAccount.usedPoints -
                    pointAccount.reservedPoints
                  : 0
              }
              minBidRequired={activeCycle?.minBidRequired ?? true}
            />
          ))
        )}
      </div>
    </div>
  );
}
