"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteOfferingButtonProps {
  offeringId: string;
  courseTitle: string;
  status: string;
}

export function DeleteOfferingButton({ offeringId, courseTitle, status }: DeleteOfferingButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canDelete = status === "DRAFT" || status === "CANCELLED";

  if (!canDelete) return null;

  async function handleDelete() {
    if (!confirm(`Delete offering "${courseTitle}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/professor/courses/${offeringId}`, { method: "DELETE" });
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
      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
      title="Delete offering"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </button>
  );
}

interface DeleteStandaloneCourseButtonProps {
  courseId: string;
  courseTitle: string;
}

export function DeleteStandaloneCourseButton({ courseId, courseTitle }: DeleteStandaloneCourseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete course proposal "${courseTitle}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/professor/courses`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
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
      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
      title="Delete course proposal"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </button>
  );
}
