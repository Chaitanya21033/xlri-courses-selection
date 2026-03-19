"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, FileText } from "lucide-react";
import { SOP_WORD_LIMIT_MIN, SOP_WORD_LIMIT_MAX } from "@/lib/constants";

interface Offering {
  id: string;
  eligibility: string;
  seatCap: number;
  status: string;
  additionalNotes: string | null;
  courseInstructions: string | null;
  requiresSop: boolean;
  sopWordLimit: number | null;
  course: { description: string | null; prerequisites: string | null; learningGoals: string | null; scheduleNotes: string | null; };
}

export function ProfessorCourseEditForm({ offering }: { offering: Offering }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    description: offering.course.description ?? "",
    prerequisites: offering.course.prerequisites ?? "",
    learningGoals: offering.course.learningGoals ?? "",
    scheduleNotes: offering.course.scheduleNotes ?? "",
    additionalNotes: offering.additionalNotes ?? "",
    courseInstructions: offering.courseInstructions ?? "",
    eligibility: offering.eligibility,
    seatCap: offering.seatCap,
    status: offering.status,
    requiresSop: offering.requiresSop,
    sopWordLimit: offering.sopWordLimit ?? 300,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSaved(false);

    if (form.requiresSop) {
      const limit = Number(form.sopWordLimit);
      if (!limit || limit < SOP_WORD_LIMIT_MIN || limit > SOP_WORD_LIMIT_MAX) {
        setError(`SOP word limit must be between ${SOP_WORD_LIMIT_MIN} and ${SOP_WORD_LIMIT_MAX}.`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        ...form,
        seatCap: Number(form.seatCap),
        requiresSop: form.requiresSop,
        sopWordLimit: form.requiresSop ? Number(form.sopWordLimit) : null,
      };
      const res = await fetch(`/api/professor/courses/${offering.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to save");
      else { setSaved(true); router.refresh(); }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {saved && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">Saved.</div>}

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Course overview for students…" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Prerequisites</Label>
          <Input value={form.prerequisites} onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Schedule Notes</Label>
          <Input value={form.scheduleNotes} onChange={e => setForm(f => ({ ...f, scheduleNotes: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Learning Goals</Label>
        <Textarea rows={2} value={form.learningGoals} onChange={e => setForm(f => ({ ...f, learningGoals: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Course Instructions / Special Notes for Students</Label>
        <Textarea rows={2} value={form.courseInstructions} onChange={e => setForm(f => ({ ...f, courseInstructions: e.target.value }))} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Eligibility</Label>
          <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.eligibility} onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))}>
            <option value="BOTH">Both</option>
            <option value="BM">BM only</option>
            <option value="HRM">HRM only</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Seat Cap Request</Label>
          <Input type="number" min={1} value={form.seatCap} onChange={e => setForm(f => ({ ...f, seatCap: parseInt(e.target.value) || 1 }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
      </div>

      {/* SOP-based intake section */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-800">SOP-Based Intake</span>
        </div>
        <p className="text-xs text-indigo-600">
          When enabled, students must submit a Statement of Purpose when applying. Ranking will be based on your scores rather than bid points.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresSop}
              onChange={e => setForm(f => ({ ...f, requiresSop: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">Require SOP from applicants</span>
          </label>
        </div>
        {form.requiresSop && (
          <div className="space-y-1.5">
            <Label>SOP Word Limit <span className="text-slate-400 font-normal">({SOP_WORD_LIMIT_MIN}–{SOP_WORD_LIMIT_MAX} words)</span></Label>
            <Input
              type="number"
              min={SOP_WORD_LIMIT_MIN}
              max={SOP_WORD_LIMIT_MAX}
              value={form.sopWordLimit}
              onChange={e => setForm(f => ({ ...f, sopWordLimit: parseInt(e.target.value) || SOP_WORD_LIMIT_MIN }))}
              className="max-w-xs"
            />
            <p className="text-xs text-slate-500">Students cannot submit an SOP longer than this word count.</p>
          </div>
        )}
      </div>

      <Button type="submit" variant="primary" disabled={loading}>
        <Save className="h-4 w-4 mr-1" />
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
