"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

interface Course { id: string; code: string; title: string; credits: number; }
interface Cycle { id: string; name: string; term: { name: string }; }
interface Professor { id: string; user: { name: string }; department: string; }

export default function NewCourseOfferingPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useExistingCourse, setUseExistingCourse] = useState(false);

  const [form, setForm] = useState({
    // New course
    code: "",
    title: "",
    credits: 3,
    description: "",
    prerequisites: "",
    learningGoals: "",
    scheduleNotes: "",
    // Existing course
    courseId: "",
    // Offering
    cycleId: "",
    professorId: "",
    eligibility: "BOTH",
    seatCap: 40,
    reservedSeatsRound1: 0,
    mrb: 0,
    additionalNotes: "",
    courseInstructions: "",
    status: "DRAFT",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/cycles").then(r => r.json()),
      fetch("/api/admin/professors-list").then(r => r.json()),
      fetch("/api/admin/courses-list").then(r => r.json()),
    ]).then(([c, p, cs]) => {
      setCycles(Array.isArray(c) ? c : []);
      setProfessors(Array.isArray(p) ? p : []);
      setCourses(Array.isArray(cs) ? cs : []);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = useExistingCourse
        ? { courseId: form.courseId, cycleId: form.cycleId, professorId: form.professorId, eligibility: form.eligibility, seatCap: form.seatCap, reservedSeatsRound1: form.reservedSeatsRound1, mrb: form.mrb, additionalNotes: form.additionalNotes, courseInstructions: form.courseInstructions, status: form.status }
        : { code: form.code, title: form.title, credits: form.credits, description: form.description, prerequisites: form.prerequisites, learningGoals: form.learningGoals, scheduleNotes: form.scheduleNotes, cycleId: form.cycleId, professorId: form.professorId, eligibility: form.eligibility, seatCap: form.seatCap, reservedSeatsRound1: form.reservedSeatsRound1, mrb: form.mrb, additionalNotes: form.additionalNotes, courseInstructions: form.courseInstructions, status: form.status };

      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, seatCap: Number(form.seatCap), credits: Number(form.credits), mrb: Number(form.mrb), reservedSeatsRound1: Number(form.reservedSeatsRound1) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create offering");
      } else {
        router.push(`/portal/admin/courses/${data.id}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const f = (key: string, val: string | number) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/courses">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Course Offering</h1>
          <p className="text-slate-500 text-sm">Create a new course and offering, or add an existing course to a new cycle.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setUseExistingCourse(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!useExistingCourse ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Create New Course
            </button>
            <button
              type="button"
              onClick={() => setUseExistingCourse(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${useExistingCourse ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Use Existing Course
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

            {useExistingCourse ? (
              <div className="space-y-1.5">
                <Label>Select Existing Course *</Label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  value={form.courseId}
                  onChange={e => f("courseId", e.target.value)}
                  required
                >
                  <option value="">Choose course…</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.title} ({c.credits} cr)</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Course Code *</Label>
                    <Input placeholder="e.g. MKTG301" value={form.code} onChange={e => f("code", e.target.value)} required />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Course Title *</Label>
                    <Input placeholder="e.g. Consumer Behaviour" value={form.title} onChange={e => f("title", e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Credits *</Label>
                  <Input type="number" min={1} max={12} value={form.credits} onChange={e => f("credits", parseInt(e.target.value) || 3)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={3} placeholder="Course overview…" value={form.description} onChange={e => f("description", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Prerequisites</Label>
                    <Input placeholder="e.g. MKTG101" value={form.prerequisites} onChange={e => f("prerequisites", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Schedule Notes</Label>
                    <Input placeholder="e.g. Mon/Wed 9–10:30" value={form.scheduleNotes} onChange={e => f("scheduleNotes", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Learning Goals</Label>
                  <Textarea rows={2} placeholder="By the end of this course…" value={form.learningGoals} onChange={e => f("learningGoals", e.target.value)} />
                </div>
              </>
            )}

            <hr className="border-slate-100" />
            <p className="text-sm font-semibold text-slate-700">Offering Details</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bidding Cycle *</Label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.cycleId} onChange={e => f("cycleId", e.target.value)} required>
                  <option value="">Select cycle…</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.name} · {c.term.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Professor *</Label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.professorId} onChange={e => f("professorId", e.target.value)} required>
                  <option value="">Select professor…</option>
                  {professors.map(p => <option key={p.id} value={p.id}>{p.user.name} — {p.department}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Eligibility *</Label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.eligibility} onChange={e => f("eligibility", e.target.value)}>
                  <option value="BOTH">Both (BM + HRM)</option>
                  <option value="BM">BM only</option>
                  <option value="HRM">HRM only</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Seat Cap *</Label>
                <Input type="number" min={1} value={form.seatCap} onChange={e => f("seatCap", parseInt(e.target.value) || 1)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Reserved Seats (R1)</Label>
                <Input type="number" min={0} value={form.reservedSeatsRound1} onChange={e => f("reservedSeatsRound1", parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Initial MRB</Label>
                <Input type="number" min={0} value={form.mrb} onChange={e => f("mrb", parseInt(e.target.value) || 0)} />
                <p className="text-xs text-slate-400">Minimum required bid. Usually starts at 0 and rises with demand.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Initial Status</Label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.status} onChange={e => f("status", e.target.value)}>
                  <option value="DRAFT">Draft (not visible to students)</option>
                  <option value="PUBLISHED">Published (visible, bidding not open)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Additional Notes for Students</Label>
              <Textarea rows={2} placeholder="Any special information for students…" value={form.additionalNotes} onChange={e => f("additionalNotes", e.target.value)} />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Next step:</strong> After creating the offering, configure the <strong>Tie-break Policy</strong> before publishing or opening bidding.
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                {loading ? "Creating…" : "Create Offering"}
              </Button>
              <Link href="/portal/admin/courses">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
