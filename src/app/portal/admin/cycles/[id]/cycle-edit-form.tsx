"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

interface Cycle {
  id: string;
  name: string;
  totalBidPoints: number;
  carryForwardEnabled: boolean;
  minBidRequired: boolean;
  crossProgEnabled: boolean;
  isActive: boolean;
}

export function CycleEditForm({ cycle }: { cycle: Cycle }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: cycle.name,
    totalBidPoints: cycle.totalBidPoints,
    carryForwardEnabled: cycle.carryForwardEnabled,
    minBidRequired: cycle.minBidRequired,
    crossProgEnabled: cycle.crossProgEnabled,
    isActive: cycle.isActive,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/cycles/${cycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {saved && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">Saved successfully.</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Cycle Name</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Total Bid Points</Label>
          <Input type="number" min={100} value={form.totalBidPoints} onChange={e => setForm(f => ({ ...f, totalBidPoints: parseInt(e.target.value) || 1000 }))} required />
        </div>
      </div>

      <div className="space-y-3">
        {[
          { key: "minBidRequired", label: "Require minimum 1-point bid" },
          { key: "carryForwardEnabled", label: "Allow carry-forward points" },
          { key: "crossProgEnabled", label: "Enable cross-programme bidding" },
          { key: "isActive", label: "Active cycle" },
        ].map(opt => (
          <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
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

      <Button type="submit" variant="primary" disabled={loading}>
        <Save className="h-4 w-4 mr-1" />
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
