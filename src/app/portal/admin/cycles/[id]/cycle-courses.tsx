"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const ELIGIBILITY_OPTIONS = [
  { value: "BM",      label: "BM only" },
  { value: "HRM",     label: "HRM only" },
  { value: "GMP",     label: "GMP only" },
  { value: "BM_HRM",  label: "BM + HRM" },
  { value: "BM_GMP",  label: "BM + GMP" },
  { value: "HRM_GMP", label: "HRM + GMP" },
  { value: "ALL",     label: "All programmes" },
];

interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  termNumber: number | null;
  defaultEligibility: string | null;
  defaultSeatCap: number | null;
}

interface Professor {
  id: string;
  employeeId: string;
  department: string;
  user: { name: string };
}

interface Offering {
  id: string;
  eligibility: string;
  seatCap: number;
  mrb: number;
  status: string;
  course: { code: string; title: string; credits: number };
  professor: { id: string; user: { name: string } };
  _count: { bids: number; allocations: number };
}

export function CycleCourses({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    courseId: "",
    professorId: "",
    eligibility: "ALL",
    seatCap: 40,
    mrb: 0,
    reservedSeatsRound1: 0,
    additionalNotes: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [offeringsRes, coursesRes, profsRes] = await Promise.all([
        fetch(`/api/admin/cycles/${cycleId}/courses`),
        fetch("/api/admin/courses?unlinked=true&cycleId=" + cycleId),
        fetch("/api/admin/professors-list"),
      ]);
      const [offeringsData, coursesData, profsData] = await Promise.all([
        offeringsRes.json(),
        coursesRes.json(),
        profsRes.json(),
      ]);
      setOfferings(offeringsData ?? []);
      setCourses(coursesData ?? []);
      setProfessors(profsData ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [cycleId]);

  // Pre-fill seatCap and eligibility from selected course
  function handleCourseSelect(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    setForm((f) => ({
      ...f,
      courseId,
      seatCap: course?.defaultSeatCap ?? 40,
      eligibility: course?.defaultEligibility ?? "ALL",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          seatCap: Number(form.seatCap),
          mrb: Number(form.mrb),
          reservedSeatsRound1: Number(form.reservedSeatsRound1),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to link course");
      } else {
        setShowForm(false);
        setForm({ courseId: "", professorId: "", eligibility: "ALL", seatCap: 40, mrb: 0, reservedSeatsRound1: 0, additionalNotes: "" });
        await load();
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(offeringId: string) {
    if (!confirm("Remove this course offering from the cycle?")) return;
    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}/courses?offeringId=${offeringId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await load();
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Could not remove offering");
      }
    } catch {
      alert("Network error");
    }
  }

  const filteredCourses = courses.filter((c) =>
    !search ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Linked offerings list */}
      {loading ? (
        <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
      ) : offerings.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No courses linked yet. Use the form below to add courses to this cycle.
        </p>
      ) : (
        <div className="space-y-2">
          {offerings.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {o.course.title}
                    <span className="ml-2 text-xs text-slate-400">{o.course.code} · {o.course.credits} cr</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {o.professor.user.name} · {o.seatCap} seats ·{" "}
                    {ELIGIBILITY_OPTIONS.find(e => e.value === o.eligibility)?.label ?? o.eligibility}
                    {o._count.bids > 0 ? ` · ${o._count.bids} bids` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  o.status === "BIDDING_OPEN" ? "success" :
                  o.status === "PUBLISHED" ? "info" :
                  o.status === "DRAFT" ? "default" : "warning"
                }>
                  {o.status.replace("_", " ")}
                </Badge>
                {o.status === "DRAFT" && o._count.bids === 0 && (
                  <button
                    onClick={() => handleRemove(o.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remove from cycle"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle Add Course form */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowForm((v) => !v)}
        className="w-full"
      >
        {showForm ? (
          <><ChevronUp className="h-4 w-4 mr-1.5" /> Hide form</>
        ) : (
          <><Plus className="h-4 w-4 mr-1.5" /> Add Course to Cycle</>
        )}
      </Button>

      {/* Add course form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm font-medium text-slate-700">Link a course to this cycle</p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Course picker */}
          <div className="space-y-1.5">
            <Label>Course <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Search by code or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <select
              value={form.courseId}
              onChange={(e) => handleCourseSelect(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— select a course —</option>
              {filteredCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title} ({c.credits} cr{c.termNumber ? `, Term ${c.termNumber}` : ""})
                </option>
              ))}
            </select>
            {filteredCourses.length === 0 && !loading && (
              <p className="text-xs text-slate-400">
                No unlinked courses found. Professors can propose new courses from their dashboard.
              </p>
            )}
          </div>

          {/* Professor */}
          <div className="space-y-1.5">
            <Label>Professor <span className="text-red-500">*</span></Label>
            <select
              value={form.professorId}
              onChange={(e) => setForm((f) => ({ ...f, professorId: e.target.value }))}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— select a professor —</option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name} ({p.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Eligibility */}
            <div className="space-y-1.5">
              <Label>Programme Eligibility</Label>
              <select
                value={form.eligibility}
                onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ELIGIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Seat cap */}
            <div className="space-y-1.5">
              <Label>Seat Capacity <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={form.seatCap}
                onChange={(e) => setForm((f) => ({ ...f, seatCap: parseInt(e.target.value) || 40 }))}
                required
              />
            </div>

            {/* MRB */}
            <div className="space-y-1.5">
              <Label>Min Required Bid (MRB)</Label>
              <Input
                type="number"
                min={0}
                value={form.mrb}
                onChange={(e) => setForm((f) => ({ ...f, mrb: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-slate-400">Minimum bid points required</p>
            </div>

            {/* Reserved seats round 1 */}
            <div className="space-y-1.5">
              <Label>Reserved Seats (Round 1)</Label>
              <Input
                type="number"
                min={0}
                value={form.reservedSeatsRound1}
                onChange={(e) => setForm((f) => ({ ...f, reservedSeatsRound1: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-slate-400">Quota seats held for first round</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Input
              value={form.additionalNotes}
              onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
              placeholder="Optional notes for students"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              <Plus className="h-4 w-4 mr-1" />
              {submitting ? "Linking…" : "Link Course"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowForm(false); setError(null); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
