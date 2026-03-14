import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { CycleEditForm } from "./cycle-edit-form";
import { RoundCreateForm } from "./round-create-form";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/portal");

  const { id } = await params;

  const cycle = await db.biddingCycle.findUnique({
    where: { id },
    include: {
      term: true,
      biddingRounds: {
        orderBy: { roundNumber: "asc" },
        include: { _count: { select: { bids: true, allocationResults: true } } },
      },
      creditConstraints: true,
      _count: { select: { courseOfferings: true, pointAccounts: true } },
    },
  });

  if (!cycle) redirect("/portal/admin/cycles");

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/cycles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Cycles
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{cycle.name}</h1>
            {cycle.isActive && <Badge variant="success">Active</Badge>}
          </div>
          <p className="text-slate-500 text-sm">{cycle.term.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Bid Points", value: cycle.totalBidPoints },
          { label: "Courses", value: cycle._count.courseOfferings },
          { label: "Students", value: cycle._count.pointAccounts },
          { label: "Rounds", value: cycle.biddingRounds.length },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit form */}
      <Card>
        <CardHeader><CardTitle>Edit Cycle Settings</CardTitle></CardHeader>
        <CardContent>
          <CycleEditForm cycle={cycle} />
        </CardContent>
      </Card>

      {/* Rounds */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Bidding Rounds</h2>
        </div>

        {cycle.biddingRounds.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-400 text-sm">
              No rounds yet. Create the first bidding round below.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cycle.biddingRounds.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{r.name}</span>
                        {r.isConfirmationRound && (
                          <Badge variant="info">Confirmation</Badge>
                        )}
                        {r.quotaRelaxed && (
                          <Badge variant="secondary">Quota relaxed</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Round {r.roundNumber}
                        {r.opensAt ? ` · Opens ${formatDate(r.opensAt)}` : ""}
                        {r.closesAt ? ` · Closes ${formatDate(r.closesAt)}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {r._count.bids} bids · {r._count.allocationResults} allocations
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          r.status === "OPEN" ? "success" :
                          r.status === "CLOSED" ? "warning" :
                          r.status === "CONFIRMED" ? "info" : "default"
                        }
                      >
                        {r.status}
                      </Badge>
                      <Link href={`/portal/admin/rounds?cycleId=${id}`}>
                        <Button variant="outline" size="sm">Manage</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Add New Round</CardTitle></CardHeader>
          <CardContent>
            <RoundCreateForm
              cycleId={id}
              nextRoundNumber={(cycle.biddingRounds[cycle.biddingRounds.length - 1]?.roundNumber ?? 0) + 1}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
