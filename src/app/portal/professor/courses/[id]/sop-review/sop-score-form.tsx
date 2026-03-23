"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, ChevronDown, ChevronUp } from "lucide-react";

type SopSelectionStatus = "SELECTED" | "MAYBE" | "NOT_SELECTED";

interface Applicant {
  bidId: string;
  studentName: string;
  rollNumber: string | null;
  programme: string | null;
  cqpi: number | null;
  bidStatus: string;
  sopText: string | null;
  sopSubmittedAt: string | null;
  sopScore: number | null;
  sopScoredAt: string | null;
  sopSelectionStatus: SopSelectionStatus | null;
}

export function SopScoreForm({
  offeringId,
  applicants,
}: {
  offeringId: string;
  applicants: Applicant[];
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(
      applicants.map((a) => [a.bidId, a.sopScore !== null ? String(a.sopScore) : ""])
    )
  );
  const [statuses, setStatuses] = useState<Record<string, SopSelectionStatus | null>>(
    Object.fromEntries(applicants.map((a) => [a.bidId, a.sopSelectionStatus ?? null]))
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Real-time counts
  const selectedCount = Object.values(statuses).filter((s) => s === "SELECTED").length;
  const maybeCount = Object.values(statuses).filter((s) => s === "MAYBE").length;
  const notSelectedCount = Object.values(statuses).filter((s) => s === "NOT_SELECTED").length;
  const unsetCount = applicants.length - selectedCount - maybeCount - notSelectedCount;

  function toggleSop(bidId: string) {
    setExpanded((prev) => ({ ...prev, [bidId]: !prev[bidId] }));
  }

  function setStatus(bidId: string, status: SopSelectionStatus) {
    setStatuses((prev) => ({
      ...prev,
      [bidId]: prev[bidId] === status ? null : status,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const toSubmit: { bidId: string; sopScore?: number; sopSelectionStatus?: SopSelectionStatus }[] = [];

    for (const a of applicants) {
      const raw = scores[a.bidId];
      const status = statuses[a.bidId];
      const entry: { bidId: string; sopScore?: number; sopSelectionStatus?: SopSelectionStatus } = {
        bidId: a.bidId,
      };

      if (raw !== "" && raw !== null && raw !== undefined) {
        const val = Number(raw);
        if (isNaN(val) || val < 0 || val > 100 || !Number.isInteger(val)) {
          setError(`Score for ${a.studentName} must be a whole number between 0 and 100.`);
          setLoading(false);
          return;
        }
        entry.sopScore = val;
      }

      if (status !== null) {
        entry.sopSelectionStatus = status;
      }

      // Only include if something to save
      if (entry.sopScore !== undefined || entry.sopSelectionStatus !== undefined) {
        toSubmit.push(entry);
      }
    }

    if (toSubmit.length === 0) {
      setError("No scores or selections to save.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/professor/sop/${offeringId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: toSubmit }),
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

  if (applicants.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400">
        No applicants have submitted bids for this course yet.
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Real-time bucket counts — professor only */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{selectedCount}</p>
          <p className="text-xs font-semibold text-emerald-600 mt-0.5">Selected</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{maybeCount}</p>
          <p className="text-xs font-semibold text-amber-600 mt-0.5">Maybe</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{notSelectedCount}</p>
          <p className="text-xs font-semibold text-red-600 mt-0.5">Not Selected</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-2xl font-bold text-slate-500">{unsetCount}</p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Unreviewed</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          Scores and selections saved successfully.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Student
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Programme
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                SOP
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Selection
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">
                Score /100
              </th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => (
              <>
                <tr
                  key={a.bidId}
                  className="border-b border-slate-50 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{a.studentName}</p>
                    <p className="text-xs text-slate-400">{a.rollNumber ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.programme ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        a.bidStatus === "WINNING"
                          ? "bg-emerald-100 text-emerald-700"
                          : a.bidStatus === "LOSING"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {a.bidStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.sopText ? (
                      <button
                        type="button"
                        onClick={() => toggleSop(a.bidId)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {expanded[a.bidId] ? (
                          <>
                            <ChevronUp className="h-3 w-3" /> Hide SOP
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" /> Read SOP
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not submitted</span>
                    )}
                    {a.sopScoredAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Scored: {new Date(a.sopScoredAt).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setStatus(a.bidId, "SELECTED")}
                        className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                          statuses[a.bidId] === "SELECTED"
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        Selected
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(a.bidId, "MAYBE")}
                        className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                          statuses[a.bidId] === "MAYBE"
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-amber-300 text-amber-600 hover:bg-amber-50"
                        }`}
                      >
                        Maybe
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(a.bidId, "NOT_SELECTED")}
                        className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                          statuses[a.bidId] === "NOT_SELECTED"
                            ? "bg-red-500 border-red-500 text-white"
                            : "border-red-300 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        Not Selected
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={scores[a.bidId] ?? ""}
                      onChange={(e) =>
                        setScores((prev) => ({ ...prev, [a.bidId]: e.target.value }))
                      }
                      className="w-20 text-right ml-auto"
                      placeholder="—"
                    />
                  </td>
                </tr>
                {expanded[a.bidId] && a.sopText && (
                  <tr key={`${a.bidId}-sop`} className="bg-indigo-50/40">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="rounded-lg border border-indigo-100 bg-white p-4">
                        <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">
                          Statement of Purpose — {a.studentName}
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {a.sopText}
                        </p>
                        {a.sopSubmittedAt && (
                          <p className="text-xs text-slate-400 mt-3">
                            Submitted: {new Date(a.sopSubmittedAt).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-500">
          Ranking order: Selected → Maybe → Not Selected, sorted by score within each group.
          Unreviewed applicants rank last.
        </p>
        <Button type="submit" variant="primary" disabled={loading}>
          <Save className="h-4 w-4 mr-1" />
          {loading ? "Saving…" : "Save Scores"}
        </Button>
      </div>
    </form>
  );
}
