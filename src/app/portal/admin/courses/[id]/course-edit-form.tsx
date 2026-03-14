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
  reservedSeatsRound1: number;
  mrb: number;
  additionalNotes: string | null;
  courseInstructions: string | null;
  status: string;
  course: { title: string; credits: number; description: string | null; prerequisites: string | null; learningGoals: string | null; scheduleNotes: string | null; };
}

export function CourseOfferingEditForm({ offering }: { offering: Offering }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: offering.course.title,
    credits: offering.course.credits,
    description: offering.course.description ?? "",
    prerequisites: offering.course.prerequisites ?? "",
    learningGoals: offering.course.learningGoals ?? "",
    scheduleNotes: offering.course.scheduleNotes ?? "",
    eligibility: offering.eligibility,
    seatCap: offering.seatCap,
    reservedSeatsRound1: offering.reservedSeatsRound1,
    mrb: offering.mrb,
    additionalNotes: offering.additionalNotes ?? "",
    courseInstructions: offering.courseInstructions ?? "",
    status: offering.status,
  });

  const f = (key: string, val: string | number) => setForm(prev => ({ ...prev, [key]: val }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`/api/admin/courses/${offering.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seatCap: Number(form.seatCap), credits: Number(form.credits), mrb: Number(form.mrb), reservedSeatsRound1: Number(form.reservedSeatsRound1) }),
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

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Course Title</Label>
          <Input value={form.title} onChange={e => f("title", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Credits</Label>
          <Input type="number" min={1} max={12} value={form.credits} onChange={e => f("credits", parseInt(e.target.value) || 3)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea rows={3} value={form.description} onChange={e => f("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Prerequisites</Label>
          <Input value={form.prerequisites} onChange={e => f("prerequisites", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Schedule Notes</Label>
          <Input value={form.scheduleNotes} onChange={e => f("scheduleNotes", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Learning Goals</Label>
        <Textarea rows={2} value={form.learningGoals} onChange={e => f("learningGoals", e.target.value)} />
      </div>

      <hr className="border-slate-100" />

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Eligibility</Label>
          <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.eligibility} onChange={e => f("eligibility", e.target.value)}>
            <option value="BOTH">Both</option>
            <option value="BM">BM only</option>
            <option value="HRM">HRM only</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Seat Cap</Label>
          <Input type="number" min={1} value={form.seatCap} onChange={e => f("seatCap", parseInt(e.target.value) || 1)} />
        </div>
        <div className="space-y-1.5">
          <Label>Reserved R1</Label>
          <Input type="number" min={0} value={form.reservedSeatsRound1} onChange={e => f("reservedSeatsRound1", parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label>MRB</Label>
          <Input type="number" min={0} value={form.mrb} onChange={e => f("mrb", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.status} onChange={e => f("status", e.target.value)}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="BIDDING_CLOSED">Bidding Closed</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Additional Notes for Students</Label>
        <Textarea rows={2} value={form.additionalNotes} onChange={e => f("additionalNotes", e.target.value)} />
      </div>

      <Button type="submit" variant="primary" disabled={loading}>
        <Save className="h-4 w-4 mr-1" />
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
