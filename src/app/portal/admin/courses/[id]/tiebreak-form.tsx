"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Lock, FileText } from "lucide-react";
import { SOP_WORD_LIMIT_MIN, SOP_WORD_LIMIT_MAX } from "@/lib/constants";

interface TieBreakPolicy {
  id: string;
  method: string;
  prerequisiteCourseCode: string | null;
  compositeWeightJson: string | null;
  manualRankJson: string | null;
  isLocked: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  CQPI_DESC: "CQPI (highest first)",
  COMPOSITE_RANK: "Composite ranking (weighted criteria)",
  MANUAL_RANK: "Manual ranked list (upload CSV)",
  SOP_SCORE: "Statement of Purpose (SOP) — professor-scored ranking",
};

const METHOD_DESCRIPTIONS: Record<string, string> = {
  CQPI_DESC: "Students with higher cumulative quality point index are prioritised. Fully automated — no additional input required.",
  COMPOSITE_RANK: "A weighted combination of CQPI and grades. Specify weights as JSON: {\"cqpi\": 0.6, \"grade\": 0.4}",
  MANUAL_RANK: "Admin or professor uploads a ranked list of eligible students. Requires uploading before bidding opens.",
  SOP_SCORE: "Students submit a Statement of Purpose when applying. You read each SOP and assign a score (0–100). Final ranking is determined by your scores in descending order. Bid points are not used.",
};

export function TieBreakForm({
  offeringId,
  apiPath,
  existingPolicy,
  existingSopWordLimit,
}: {
  offeringId: string;
  apiPath: string;
  existingPolicy: TieBreakPolicy | null;
  existingSopWordLimit?: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    method: existingPolicy?.method ?? "CQPI_DESC",
    prerequisiteCourseCode: existingPolicy?.prerequisiteCourseCode ?? "",
    compositeWeightJson: existingPolicy?.compositeWeightJson ?? '{"cqpi": 0.6, "grade": 0.4}',
    manualRankJson: existingPolicy?.manualRankJson ?? "",
    sopWordLimit: existingSopWordLimit ?? 300,
  });

  if (existingPolicy?.isLocked) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Lock className="h-4 w-4 text-slate-400" />
        <div>
          <p className="font-medium">Policy locked: <strong>{METHOD_LABELS[existingPolicy.method]}</strong></p>
          <p className="text-slate-400 mt-0.5">Locked policies cannot be changed after bidding opens.</p>
        </div>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSaved(false);

    if (form.method === "SOP_SCORE") {
      const limit = Number(form.sopWordLimit);
      if (!limit || limit < SOP_WORD_LIMIT_MIN || limit > SOP_WORD_LIMIT_MAX) {
        setError(`SOP word limit must be between ${SOP_WORD_LIMIT_MIN} and ${SOP_WORD_LIMIT_MAX}.`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        method: form.method,
        prerequisiteCourseCode: form.prerequisiteCourseCode || undefined,
        compositeWeightJson: form.compositeWeightJson || undefined,
        manualRankJson: form.manualRankJson || undefined,
        sopWordLimit: form.method === "SOP_SCORE" ? Number(form.sopWordLimit) : undefined,
      };
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to save");
      else { setSaved(true); router.refresh(); }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {saved && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">Tie-break policy saved.</div>}

      <div className="space-y-1.5">
        <Label>Ranking / Tie-break Method *</Label>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          value={form.method}
          onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
        >
          {Object.entries(METHOD_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500">{METHOD_DESCRIPTIONS[form.method]}</p>
      </div>

      {form.method === "COMPOSITE_RANK" && (
        <div className="space-y-1.5">
          <Label>Composite Weights (JSON)</Label>
          <Input
            value={form.compositeWeightJson}
            onChange={e => setForm(f => ({ ...f, compositeWeightJson: e.target.value }))}
            placeholder='{"cqpi": 0.6, "grade": 0.4}'
          />
          <p className="text-xs text-slate-400">Keys: cqpi, grade. Values must sum to 1.0.</p>
        </div>
      )}

      {form.method === "MANUAL_RANK" && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
          <p className="font-medium mb-1">Manual rank list</p>
          <p className="text-xs text-slate-500">Upload a JSON array of roll numbers in preferred order. Example: ["BM2301","BM2302","HRM2401"]</p>
          <Input
            className="mt-2"
            placeholder='["ROLLNO1","ROLLNO2",...]'
            value={form.manualRankJson}
            onChange={e => setForm(f => ({ ...f, manualRankJson: e.target.value }))}
          />
        </div>
      )}

      {form.method === "SOP_SCORE" && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-800">SOP Word Limit</span>
          </div>
          <div className="space-y-1.5">
            <Label>
              Maximum words students may write{" "}
              <span className="text-slate-400 font-normal">({SOP_WORD_LIMIT_MIN}–{SOP_WORD_LIMIT_MAX})</span>
            </Label>
            <Input
              type="number"
              min={SOP_WORD_LIMIT_MIN}
              max={SOP_WORD_LIMIT_MAX}
              value={form.sopWordLimit}
              onChange={e => setForm(f => ({ ...f, sopWordLimit: parseInt(e.target.value) || SOP_WORD_LIMIT_MIN }))}
              className="max-w-xs"
            />
          </div>
          <p className="text-xs text-indigo-600">
            After applications close, go to <strong>Review SOPs &amp; Score</strong> to read each SOP and enter marks (0–100).
            The final seat allocation will rank students by your scores, highest first.
          </p>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
        All tie-break decisions are fully auditable. The method and any inputs are logged at the time of allocation.
      </div>

      <Button type="submit" variant="primary" disabled={loading}>
        <Save className="h-4 w-4 mr-1" />
        {loading ? "Saving…" : existingPolicy ? "Update Policy" : "Set Policy"}
      </Button>
    </form>
  );
}
