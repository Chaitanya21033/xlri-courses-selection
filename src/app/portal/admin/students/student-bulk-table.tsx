"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Trash2, Loader2, Search, Filter, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Student {
  id: string;
  rollNumber: string;
  programme: string;
  cqpi: number;
  isActive: boolean;
  user: { name: string; email: string; lastLoginAt: Date | null };
  batch: { name: string };
}

interface Props {
  students: Student[];
  currentQ?: string;
  currentProgramme?: string;
}

export function StudentBulkTable({ students, currentQ, currentProgramme }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(currentQ ?? "");
  const [programme, setProgramme] = useState(currentProgramme ?? "ALL");

  function applyFilter() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (programme && programme !== "ALL") params.set("programme", programme);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s.id)));
    }
  }

  async function deleteOne(studentId: string, name: string) {
    if (!confirm(`Delete student "${name}"? This will remove their account, bids, and allocations. This cannot be undone.`)) return;
    setDeleting(studentId);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Could not delete student");
      } else {
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected student(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/students/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error ?? "Bulk delete failed.");
      } else {
        setSelected(new Set());
        router.refresh();
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter()}
            placeholder="Search name, email, roll no..."
            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={programme}
          onChange={(e) => setProgramme(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="ALL">All Programmes</option>
          <option value="BM">BM only</option>
          <option value="HRM">HRM only</option>
        </select>
        <Button size="sm" variant="ghost" onClick={applyFilter} className="h-9">
          <Filter className="h-4 w-4 mr-1" /> Filter
        </Button>

        {selected.size > 0 && (
          <Button
            size="sm"
            className="h-9 bg-red-600 hover:bg-red-700 text-white"
            onClick={bulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            Delete {selected.size} selected
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selected.size === students.length}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Roll No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Programme</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Batch</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CQPI</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <GraduationCap className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-400 text-sm">No students found.</p>
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/60 ${
                        selected.has(s.id) ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 text-xs">{s.rollNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.user.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.programme === "BM" ? "primary" : "warning"}>
                          {s.programme}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{s.batch.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {s.cqpi.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.isActive ? "success" : "destructive"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteOne(s.id, s.user.name)}
                          disabled={deleting === s.id}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title={`Delete ${s.user.name}`}
                        >
                          {deleting === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
