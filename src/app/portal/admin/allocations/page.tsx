import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllocationStatusColor } from "@/lib/utils";
import { Download } from "lucide-react";
import { OverrideButton } from "./override-button";

export default async function AdminAllocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ roundId?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const { roundId } = await searchParams;

  // Fetch all rounds for the filter dropdown
  const rounds = await db.biddingRound.findMany({
    include: { cycle: { select: { name: true } } },
    orderBy: [{ cycleId: "asc" }, { roundNumber: "asc" }],
  });

  const selectedRound = roundId
    ? rounds.find((r) => r.id === roundId)
    : rounds.find((r) => r.status === "CLOSED" || r.status === "CONFIRMED") ?? rounds[0];

  const allocations = selectedRound
    ? await db.allocationResult.findMany({
        where: { roundId: selectedRound.id },
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
              batch: { select: { name: true } },
            },
          },
          offering: {
            include: {
              course: { select: { code: true, title: true, credits: true } },
              professor: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: [{ offering: { course: { code: "asc" } } }, { status: "asc" }],
      })
    : [];

  const stats = {
    confirmed: allocations.filter((a) => a.status === "CONFIRMED").length,
    tentative: allocations.filter((a) => a.status === "TENTATIVE").length,
    withdrawn: allocations.filter((a) => a.status === "WITHDRAWN").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocation Results</h1>
          <p className="text-slate-500 mt-1">
            View, override, and export allocation results per round.
          </p>
        </div>
        {selectedRound && (
          <a
            href={`/api/admin/export/allocations?roundId=${selectedRound.id}`}
            download
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        )}
      </div>

      {/* Round selector */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Round:</label>
            <select
              name="roundId"
              defaultValue={selectedRound?.id ?? ""}
              onChange={(e) => {
                // handled by form submit; JS-free fallback
              }}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onBlur={(e) => {
                (e.target.closest("form") as HTMLFormElement)?.submit();
              }}
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.cycle.name} — {r.name} ({r.status})
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit" className="text-sm text-indigo-600">Filter</button>
            </noscript>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedRound && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Confirmed</p>
              <p className="text-xl font-bold text-emerald-600">{stats.confirmed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Tentative</p>
              <p className="text-xl font-bold text-amber-600">{stats.tentative}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Withdrawn</p>
              <p className="text-xl font-bold text-slate-400">{stats.withdrawn}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedRound
              ? `${selectedRound.cycle.name} — ${selectedRound.name}`
              : "No round selected"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allocations.length === 0 ? (
            <p className="px-6 py-10 text-center text-slate-400 text-sm">
              No allocation results for this round.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Programme</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Credits</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pts</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tie-break</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{a.student.user.name}</p>
                        <p className="text-xs text-slate-400">{a.student.rollNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={a.student.programme === "BM" ? "primary" : "warning"}>
                          {a.student.programme}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{a.offering.course.code}</p>
                        <p className="text-xs text-slate-400">{a.offering.course.title}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {a.offering.course.credits}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700">
                        {a.finalPoints}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getAllocationStatusColor(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {a.tieBroken ? `Rank #${a.tieBreakRank}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <OverrideButton
                          allocationId={a.id}
                          currentStatus={a.status}
                          studentName={a.student.user.name}
                          courseCode={a.offering.course.code}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
