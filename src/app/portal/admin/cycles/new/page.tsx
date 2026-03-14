"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

interface Term { id: string; name: string; startDate: string; endDate: string; }

export default function NewCyclePage() {
  const router = useRouter();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    termId: "",
    totalBidPoints: 1000,
    carryForwardEnabled: false,
    minBidRequired: true,
    crossProgEnabled: false,
    isActive: false,
    minCredits: 6,
    maxCredits: 20,
  });

  useEffect(() => {
    fetch("/api/admin/terms").then(r => r.json()).then(setTerms).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create cycle");
      } else {
        router.push(`/portal/admin/cycles/${data.id}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/cycles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Bidding Cycle</h1>
          <p className="text-slate-500 text-sm">Set up a new academic term bidding cycle.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycle Configuration</CardTitle>
          <CardDescription>All fields can be edited later except the academic term.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Cycle Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Term 3 Elective Bidding 2025–26"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="termId">Academic Term *</Label>
              {terms.length > 0 ? (
                <select
                  id="termId"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.termId}
                  onChange={e => setForm(f => ({ ...f, termId: e.target.value }))}
                  required
                >
                  <option value="">Select term…</option>
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id="termId"
                  placeholder="Term ID (paste from DB or create term first)"
                  value={form.termId}
                  onChange={e => setForm(f => ({ ...f, termId: e.target.value }))}
                  required
                />
              )}
              <p className="text-xs text-slate-400">If no terms appear, use the Prisma Studio or seed to create an AcademicTerm first.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="totalBidPoints">Total Bid Points per Student *</Label>
              <Input
                id="totalBidPoints"
                type="number"
                min={100}
                max={10000}
                value={form.totalBidPoints}
                onChange={e => setForm(f => ({ ...f, totalBidPoints: parseInt(e.target.value) || 1000 }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="minCredits">Min Credits</Label>
                <Input
                  id="minCredits"
                  type="number"
                  min={0}
                  value={form.minCredits}
                  onChange={e => setForm(f => ({ ...f, minCredits: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxCredits">Max Credits</Label>
                <Input
                  id="maxCredits"
                  type="number"
                  min={0}
                  value={form.maxCredits}
                  onChange={e => setForm(f => ({ ...f, maxCredits: parseInt(e.target.value) || 20 }))}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-slate-700">Policy Options</p>
              {[
                { key: "minBidRequired", label: "Require minimum 1-point bid", desc: "Students must place at least 1 point per course bid." },
                { key: "carryForwardEnabled", label: "Allow carry-forward points", desc: "Unused points carry over to the next round." },
                { key: "crossProgEnabled", label: "Enable cross-programme bidding", desc: "Students may bid on courses from the other programme (subject to eligibility)." },
                { key: "isActive", label: "Activate this cycle now", desc: "Makes this the active cycle. Deactivates any currently active cycle." },
              ].map(opt => (
                <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                    checked={(form as any)[opt.key]}
                    onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                {loading ? "Creating…" : "Create Cycle"}
              </Button>
              <Link href="/portal/admin/cycles">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
