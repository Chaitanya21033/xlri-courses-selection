"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  offeringId: string;
  courseCode: string;
}

export function CancelCourseButton({ offeringId, courseCode }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${offeringId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Cancellation failed.");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-3 w-3 mr-1" />
        Cancel Course
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Cancel Course</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Cancelling <strong>{courseCode}</strong> will reimburse all active bid points to
              affected students and notify them. This action cannot be undone.
            </p>
            <form onSubmit={handleCancel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Insufficient enrollment to run the course..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
                  Keep Course
                </Button>
                <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
