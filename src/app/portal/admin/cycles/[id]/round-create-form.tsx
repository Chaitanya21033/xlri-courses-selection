"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function RoundCreateForm({ cycleId, nextRoundNumber }: { cycleId: string; nextRoundNumber: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: `Round ${nextRoundNumber}`,
    roundNumber: nextRoundNumber,
    opensAt: "",
    closesAt: "",
    isConfirmationRound: false,
    quotaRelaxed: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          ...form,
          roundNumber: Number(form.roundNumber),
          opensAt: form.opensAt || undefined,
          closesAt: form.closesAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create round");
      } else {
        setForm(f => ({ ...f, name: `Round ${f.roundNumber + 1}`, roundNumber: f.roundNumber + 1, opensAt: "", closesAt: "" }));
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Round Number</Label>
          <Input type="number" min={1} value={form.roundNumber} onChange={e => setForm(f => ({ ...f, roundNumber: parseInt(e.target.value) || 1 }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Round Name</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Opens At (optional)</Label>
          <Input type="datetime-local" value={form.opensAt} onChange={e => setForm(f => ({ ...f, opensAt: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Closes At (optional)</Label>
          <Input type="datetime-local" value={form.closesAt} onChange={e => setForm(f => ({ ...f, closesAt: e.target.value }))} />
        </div>
      </div>

      <div className="flex gap-4">
        {[
          { key: "isConfirmationRound", label: "Confirmation round" },
          { key: "quotaRelaxed", label: "Quota relaxed" },
        ].map(opt => (
          <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              checked={(form as any)[opt.key]}
              onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))}
            />
            <span className="text-sm text-slate-700">{opt.label}</span>
          </label>
        ))}
      </div>

      <Button type="submit" variant="secondary" size="sm" disabled={loading}>
        <Plus className="h-4 w-4 mr-1" />
        {loading ? "Creating…" : "Add Round"}
      </Button>
    </form>
  );
}
