"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  allocationId: string;
  status: string;
}

export function ConfirmationActions({ allocationId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "withdraw" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "confirm" | "withdraw") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/student/allocations/${allocationId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-500 max-w-[180px] text-right">{error}</span>
      )}
      {status === "TENTATIVE" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          onClick={() => handleAction("confirm")}
          disabled={loading !== null}
        >
          {loading === "confirm" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          )}
          Confirm
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => handleAction("withdraw")}
        disabled={loading !== null}
      >
        {loading === "withdraw" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <XCircle className="h-3 w-3 mr-1" />
        )}
        Withdraw
      </Button>
    </div>
  );
}
