"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function AllocateButton({ roundId }: { roundId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ winners?: number; losers?: number; errors?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAllocation() {
    if (!confirm("Run allocation engine for this round? This will compute winners, resolve tie-breaks, and reimburse losing bids. This action is logged.")) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/admin/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Allocation failed");
      else {
        setResult({ winners: data.totalWinners, losers: data.totalLosers, errors: data.errors });
        router.refresh();
      }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="primary" size="sm" onClick={runAllocation} disabled={loading}>
        <Zap className="h-3.5 w-3.5 mr-1" />
        {loading ? "Running…" : "Run Allocation"}
      </Button>
      {error && <p className="text-xs text-red-600 max-w-[200px] text-right">{error}</p>}
      {result && (
        <p className="text-xs text-emerald-600 text-right">
          Done: {result.winners} winners, {result.losers} reimbursed
          {result.errors?.length ? ` · ${result.errors.length} error(s)` : ""}
        </p>
      )}
    </div>
  );
}
