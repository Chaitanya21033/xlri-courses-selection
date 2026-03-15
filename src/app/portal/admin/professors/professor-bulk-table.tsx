"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Trash2, Loader2, Search, Filter, GraduationCap, BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Professor {
  id: string;
  department: string;
  designation: string | null;
  isActive: boolean;
  createdAt: Date;
  user: { name: string; email: string };
  courseOfferings: Array<{
    id: string;
    course: { title: string; code: string };
    _count: { bids: number; allocations: number };
  }>;
}

interface Props {
  professors: Professor[];
  departments: string[];
  currentQ?: string;
  currentDepartment?: string;
}

export function ProfessorBulkTable({ professors, departments, currentQ, currentDepartment }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [q, setQ] = useState(currentQ ?? "");
  const [department, setDepartment] = useState(currentDepartment ?? "ALL");

  function applyFilter() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (department && department !== "ALL") params.set("department", department);
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
    if (selected.size === professors.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(professors.map((p) => p.id)));
    }
  }

  async function deleteOne(profId: string, name: string) {
    if (!confirm(`Delete professor "${name}"? This cannot be undone.`)) return;
    setDeleting(profId);
    try {
      const res = await fetch(`/api/admin/professors/${profId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Could not delete professor");
      } else {
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected professor(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/professors/bulk-delete", {
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
            placeholder="Search name, email, department..."
            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="ALL">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
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
            {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
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
                      checked={professors.length > 0 && selected.size === professors.length}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Designation</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Courses</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bids</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {professors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <GraduationCap className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-400 text-sm">No professors found.</p>
                    </td>
                  </tr>
                ) : (
                  professors.map((prof) => {
                    const totalBids = prof.courseOfferings.reduce((s, o) => s + o._count.bids, 0);
                    return (
                      <tr
                        key={prof.id}
                        className={`border-b border-slate-50 hover:bg-slate-50/60 ${
                          selected.has(prof.id) ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(prof.id)}
                            onChange={() => toggleSelect(prof.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-indigo-700">
                                {prof.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{prof.user.name}</p>
                              <p className="text-xs text-slate-400">{prof.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{prof.department}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{prof.designation ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <BookMarked className="h-3.5 w-3.5 text-slate-400" />
                            {prof.courseOfferings.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-indigo-700">{totalBids}</td>
                        <td className="px-4 py-3">
                          <Badge variant={prof.isActive ? "success" : "warning"}>
                            {prof.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{formatDate(prof.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteOne(prof.id, prof.user.name)}
                            disabled={deleting === prof.id}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          >
                            {deleting === prof.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
