"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, ClipboardList } from "lucide-react";
import Link from "next/link";

interface Cycle {
  id: string;
  name: string;
  term: { name: string };
  biddingRounds: { roundNumber: number }[];
}

function defaultDatetime(offsetMinutes = 0): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewRoundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCycleId = searchParams.get("cycleId") ?? "";

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);

  const [form, setForm] = useState({
    cycleId: prefillCycleId,
    roundNumber: 1,
    name: "Round 1",
    opensAt: defaultDatetime(0),
    closesAt: defaultDatetime(5 * 24 * 60),
    isConfirmationRound: false,
    quotaRelaxed: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cycles for the selector
  useEffect(() => {
    fetch("/api/admin/cycles")
      .then((r) => r.json())
      .then((data) => {
        setCycles(data ?? []);
        // If no cycle pre-selected, pick the first one
        if (!prefillCycleId && data?.length > 0) {
          const firstCycle = data[0];
          const nextNum = (firstCycle.biddingRounds[firstCycle.biddingRounds.length - 1]?.roundNumber ?? 0) + 1;
          setForm((f) => ({
            ...f,
            cycleId: firstCycle.id,
            roundNumber: nextNum,
            name: `Round ${nextNum}`,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setCyclesLoading(false));
  }, [prefillCycleId]);

  // When cycle selection changes, suggest next round number
  function handleCycleChange(cycleId: string) {
    const cycle = cycles.find((c) => c.id === cycleId);
    const nextNum = cycle
      ? (cycle.biddingRounds[cycle.biddingRounds.length - 1]?.roundNumber ?? 0) + 1
      : 1;
    setForm((f) => ({ ...f, cycleId, roundNumber: nextNum, name: `Round ${nextNum}` }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cycleId) { setError("Please select a bidding cycle."); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: form.cycleId,
          roundNumber: Number(form.roundNumber),
          name: form.name,
          opensAt: form.opensAt || undefined,
          closesAt: form.closesAt || undefined,
          isConfirmationRound: form.isConfirmationRound,
          quotaRelaxed: form.quotaRelaxed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create round");
      } else {
        router.push(`/portal/admin/rounds?cycleId=${form.cycleId}`);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/rounds">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Rounds
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            New Bidding Round
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Create a new round within a bidding cycle. Status starts as DRAFT — open it manually when ready.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Round Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Cycle selector */}
            <div className="space-y-1.5">
              <Label htmlFor="cycleId">
                Bidding Cycle <span className="text-red-500">*</span>
              </Label>
              {cyclesLoading ? (
                <div className="h-10 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                <select
                  id="cycleId"
                  value={form.cycleId}
                  onChange={(e) => handleCycleChange(e.target.value)}
                  required
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— select a cycle —</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.term.name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Round number + name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="roundNumber">
                  Round Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="roundNumber"
                  type="number"
                  min={1}
                  value={form.roundNumber}
                  onChange={(e) => setForm((f) => ({ ...f, roundNumber: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Round Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Primary Bidding Round"
                  required
                />
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="opensAt">Opens At</Label>
                <Input
                  id="opensAt"
                  type="datetime-local"
                  value={form.opensAt}
                  onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value }))}
                />
                <p className="text-xs text-slate-400">When students can start bidding</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closesAt">Closes At</Label>
                <Input
                  id="closesAt"
                  type="datetime-local"
                  value={form.closesAt}
                  onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value }))}
                />
                <p className="text-xs text-slate-400">Bid submission deadline</p>
              </div>
            </div>

            {/* Options */}
            <div className="flex gap-6">
              {[
                { key: "isConfirmationRound", label: "Confirmation round", hint: "Students confirm or withdraw allocations" },
                { key: "quotaRelaxed", label: "Quota relaxed", hint: "Cross-programme seat restrictions lifted" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                    checked={(form as any)[opt.key]}
                    onChange={(e) => setForm((f) => ({ ...f, [opt.key]: e.target.checked }))}
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                    <p className="text-xs text-slate-400">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Info box */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700">
              Round starts in <strong>DRAFT</strong> status. Go to <strong>Admin → Rounds</strong> and click <strong>Open Round</strong> when you're ready to accept bids.
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={loading || !form.cycleId}>
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Create Round
                  </span>
                )}
              </Button>
              <Link href="/portal/admin/rounds">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
