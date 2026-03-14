"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Clock } from "lucide-react";

interface RoundControlsProps {
  roundId: string;
  status: string;
}

function defaultDatetime(offsetMinutes = 0): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RoundControls({ roundId, status }: RoundControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [opensAt, setOpensAt] = useState(defaultDatetime(0));
  const [closesAt, setClosesAt] = useState(defaultDatetime(5 * 24 * 60)); // +5 days

  // Close dialog
  const [closeDialog, setCloseDialog] = useState(false);
  const [closedAt, setClosedAt] = useState(defaultDatetime(0));

  async function updateStatus(newStatus: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rounds/${roundId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update round");
      } else {
        router.refresh();
        setOpenDialog(false);
        setCloseDialog(false);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 items-end">
        {status === "DRAFT" && (
          <Button
            variant="success"
            size="sm"
            onClick={() => {
              setOpensAt(defaultDatetime(0));
              setClosesAt(defaultDatetime(5 * 24 * 60));
              setError(null);
              setOpenDialog(true);
            }}
            disabled={loading}
          >
            Open Round
          </Button>
        )}
        {status === "OPEN" && (
          <Button
            variant="warning"
            size="sm"
            onClick={() => {
              setClosedAt(defaultDatetime(0));
              setError(null);
              setCloseDialog(true);
            }}
            disabled={loading}
          >
            Close Round
          </Button>
        )}
        {status === "CLOSED" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => updateStatus("CONFIRMED")}
            disabled={loading}
          >
            Confirm Results
          </Button>
        )}
        {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
      </div>

      {/* ── Open Round dialog ── */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Open Bidding Round
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <p className="text-sm text-slate-500">
              Set the start and end timestamps. The round is marked <strong>OPEN</strong> immediately and the timestamps are recorded in the audit log.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="opensAt" className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Opens at <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="opensAt"
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
                <p className="text-xs text-slate-400">When students can start placing bids</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closesAt" className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Closes at (optional)
                </Label>
                <Input
                  id="closesAt"
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
                <p className="text-xs text-slate-400">Deadline for bids — close the round manually when ready</p>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpenDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={loading || !opensAt}
              onClick={() =>
                updateStatus("OPEN", {
                  opensAt: new Date(opensAt).toISOString(),
                  closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
                })
              }
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Opening…
                </span>
              ) : "Confirm & Open Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close Round dialog ── */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Close Bidding Round
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <p className="text-sm text-slate-500">
              Closing stops all new bids. Set the official close timestamp for the audit record.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="closedAt" className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Closed at <span className="text-red-500">*</span>
              </Label>
              <Input
                id="closedAt"
                type="datetime-local"
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCloseDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="warning"
              size="sm"
              disabled={loading || !closedAt}
              onClick={() =>
                updateStatus("CLOSED", {
                  closesAt: new Date(closedAt).toISOString(),
                })
              }
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Closing…
                </span>
              ) : "Confirm & Close Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
