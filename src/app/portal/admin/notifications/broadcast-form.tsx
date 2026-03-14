"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

const AUDIENCES = [
  { value: "ALL", label: "Everyone (all active users)" },
  { value: "STUDENTS", label: "Students only" },
  { value: "PROFESSORS", label: "Professors only" },
  { value: "ADMINS", label: "Admins only" },
];

const TYPES = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "ROUND_OPENED", label: "Round Opened" },
  { value: "ROUND_CLOSED", label: "Round Closed" },
  { value: "ALLOCATION_RESULT", label: "Allocation Result" },
  { value: "CONFIRMATION_REQUIRED", label: "Confirmation Required" },
  { value: "COURSE_CANCELLED", label: "Course Cancelled" },
  { value: "SYSTEM", label: "System Notice" },
];

export function BroadcastForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    audience: "ALL",
    type: "ANNOUNCEMENT",
    title: "",
    message: "",
    link: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send this notification to: ${form.audience}?`)) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to send");
      else {
        setResult(`Sent to ${data.sent} user(s).`);
        setForm(f => ({ ...f, title: "", message: "", link: "" }));
        router.refresh();
      }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {result && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{result}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Audience *</Label>
          <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
            {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input placeholder="e.g. Round 1 is now open" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required maxLength={200} />
      </div>

      <div className="space-y-1.5">
        <Label>Message *</Label>
        <Textarea rows={3} placeholder="Notification body…" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required maxLength={2000} />
      </div>

      <div className="space-y-1.5">
        <Label>Link (optional)</Label>
        <Input placeholder="/portal/student/catalog" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
        <p className="text-xs text-slate-400">Optional relative link to append to the notification.</p>
      </div>

      <Button type="submit" variant="primary" disabled={loading}>
        <Send className="h-4 w-4 mr-1" />
        {loading ? "Sending…" : "Send Notification"}
      </Button>
    </form>
  );
}
