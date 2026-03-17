"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteCourseButtonProps {
  offeringId: string;
  courseTitle: string;
  status: string;
}

export function DeleteCourseButton({ offeringId, courseTitle, status }: DeleteCourseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canDelete = status === "DRAFT" || status === "CANCELLED";

  if (!canDelete) return null;

  async function handleDelete() {
    if (!confirm(`Delete offering "${courseTitle}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${offeringId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to delete");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
      title="Delete offering"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
