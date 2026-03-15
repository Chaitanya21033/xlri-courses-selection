import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, ShieldCheck, ToggleLeft, Sliders } from "lucide-react";
import { SettingsEditor } from "./settings-editor";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/portal");
  }

  const [systemSettings, activeCycles, creditConstraints] = await Promise.all([
    db.systemSetting.findMany({ orderBy: { key: "asc" } }),
    db.biddingCycle.findMany({
      where: { isActive: true },
      include: {
        term: true,
        creditConstraints: true,
        biddingRounds: { orderBy: { roundNumber: "asc" } },
      },
    }),
    db.creditConstraint.findMany({
      include: { cycle: { include: { term: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-slate-500 mt-1">
          Global configuration, credit constraints, and cycle settings.
        </p>
      </div>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-400" />
            <CardTitle>System Settings</CardTitle>
          </div>
          <CardDescription>Key-value configuration stored in the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsEditor settings={systemSettings} />
        </CardContent>
      </Card>

      {/* Active Cycle Configuration */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-slate-400" />
          Active Cycle Configuration
        </h2>

        {activeCycles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-400">
              <p className="text-sm">No active bidding cycles.</p>
            </CardContent>
          </Card>
        ) : (
          activeCycles.map((cycle) => (
            <Card key={cycle.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cycle.name}</CardTitle>
                  <Badge variant="success">Active</Badge>
                </div>
                <CardDescription>{cycle.term.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-400">Total Bid Points</p>
                    <p className="text-lg font-bold text-indigo-700">{cycle.totalBidPoints}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-400">Carry Forward</p>
                    <p className="flex items-center gap-1.5 mt-1">
                      <ToggleLeft className={`h-4 w-4 ${cycle.carryForwardEnabled ? "text-emerald-500" : "text-slate-300"}`} />
                      <span className="text-sm font-medium text-slate-700">
                        {cycle.carryForwardEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-400">Min Bid Required</p>
                    <p className="flex items-center gap-1.5 mt-1">
                      <ShieldCheck className={`h-4 w-4 ${cycle.minBidRequired ? "text-emerald-500" : "text-slate-300"}`} />
                      <span className="text-sm font-medium text-slate-700">
                        {cycle.minBidRequired ? "Yes" : "No"}
                      </span>
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-400">Cross-Programme</p>
                    <p className="flex items-center gap-1.5 mt-1">
                      <ToggleLeft className={`h-4 w-4 ${cycle.crossProgEnabled ? "text-emerald-500" : "text-slate-300"}`} />
                      <span className="text-sm font-medium text-slate-700">
                        {cycle.crossProgEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Credit Constraints */}
                {cycle.creditConstraints.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Credit Constraints
                    </p>
                    <div className="space-y-2">
                      {cycle.creditConstraints.map((cc) => (
                        <div
                          key={cc.id}
                          className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100"
                        >
                          <span className="text-sm font-medium text-slate-700">{cc.programme}</span>
                          <span className="text-sm text-indigo-700">
                            {cc.minCredits} – {cc.maxCredits} credits
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rounds */}
                {cycle.biddingRounds.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Rounds ({cycle.biddingRounds.length})
                    </p>
                    <div className="space-y-2">
                      {cycle.biddingRounds.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <span className="text-sm font-medium text-slate-700">{r.name}</span>
                            {r.isConfirmationRound && (
                              <span className="ml-2 text-xs text-amber-600">(Confirmation)</span>
                            )}
                          </div>
                          <Badge
                            variant={
                              r.status === "OPEN"
                                ? "success"
                                : r.status === "DRAFT"
                                ? "warning"
                                : r.status === "CONFIRMED"
                                ? "info"
                                : "default"
                            }
                          >
                            {r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Credit Constraints (all cycles) */}
      {creditConstraints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Credit Constraints</CardTitle>
            <CardDescription>Per-programme credit limits across all cycles.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cycle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Programme</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Min Credits</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Max Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {creditConstraints.map((cc) => (
                    <tr key={cc.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{cc.cycle.name}</p>
                        <p className="text-xs text-slate-400">{cc.cycle.term.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cc.programme === "BM" ? "primary" : cc.programme === "HRM" ? "warning" : "info"}>
                          {cc.programme}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{cc.minCredits}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{cc.maxCredits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
