"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface RoundControlsProps {
  roundId: string;
  status: string;
}

export function RoundControls({ roundId, status }: RoundControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rounds/${roundId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update round");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {status === "DRAFT" && (
        <Button
          variant="success"
          size="sm"
          onClick={() => updateStatus("OPEN")}
          disabled={loading}
        >
          Open Round
        </Button>
      )}
      {status === "OPEN" && (
        <Button
          variant="warning"
          size="sm"
          onClick={() => updateStatus("CLOSED")}
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
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
