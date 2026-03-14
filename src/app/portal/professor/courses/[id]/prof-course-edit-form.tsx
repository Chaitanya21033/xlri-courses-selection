"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface Offering {
  id: string;
  eligibility: string;
  seatCap: number;
  status: string;
  additionalNotes: string | null;
  courseInstructions: string | null;
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
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`/api/professor/courses/${offering.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seatCap: Number(form.seatCap) }),
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

      <Button type="submit" variant="primary" disabled={loading}>
        <Save className="h-4 w-4 mr-1" />
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
