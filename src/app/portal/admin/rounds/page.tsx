import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RoundControls } from "./round-controls";

export default async function AdminRoundsPage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const params = await searchParams;
  const cycleId = params.cycleId;

  const rounds = await db.biddingRound.findMany({
    where: cycleId ? { cycleId } : undefined,
    include: {
      cycle: { select: { name: true } },
      _count: { select: { bids: true, allocationResults: true } },
    },
    orderBy: [{ cycleId: "asc" }, { roundNumber: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bidding Rounds</h1>
          <p className="text-slate-500 mt-1">
            Open, close, and manage individual bidding rounds.
          </p>
        </div>
        <Link href="/portal/admin/rounds/new">
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Round
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {rounds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-400">
              <p>No bidding rounds configured.</p>
            </CardContent>
          </Card>
        ) : (
          rounds.map((round) => (
            <Card key={round.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{round.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          round.status === "OPEN"
                            ? "bg-green-100 text-green-700"
                            : round.status === "CLOSED"
                            ? "bg-orange-100 text-orange-700"
                            : round.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {round.status}
                      </span>
                      {round.isConfirmationRound && (
                        <Badge variant="info">Confirmation Round</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {round.cycle.name} · Round {round.roundNumber}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      {round.opensAt && (
                        <span>Opens: {formatDateTime(round.opensAt)}</span>
                      )}
                      {round.closesAt && (
                        <span>Closes: {formatDateTime(round.closesAt)}</span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-600">
                      <span>{round._count.bids} bids placed</span>
                      <span>{round._count.allocationResults} allocations</span>
                    </div>
                  </div>
                  <RoundControls roundId={round.id} status={round.status} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
