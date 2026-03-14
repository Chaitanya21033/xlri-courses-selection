"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteProfessorButton({ professorId, name }: { professorId: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete professor "${name}"? This will remove their account and all associated data. This cannot be undone.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/professors/${professorId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Could not delete professor");
      } else {
        router.refresh();
      }
    } catch {
      alert("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
      title={`Delete ${name}`}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 border-2 border-slate-300 border-t-red-400 rounded-full animate-spin inline-block" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
