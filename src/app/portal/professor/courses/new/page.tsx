"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, ArrowRight, BookMarked, Save, CheckCircle2,
  Paperclip, X, Upload, FileText, Loader2, Scale,
} from "lucide-react";
import Link from "next/link";
import { SOP_WORD_LIMIT_MIN, SOP_WORD_LIMIT_MAX } from "@/lib/constants";

const ELIGIBILITY_OPTIONS = [
  { value: "BM",      label: "BM only",       desc: "Bachelor of Management students only" },
  { value: "HRM",     label: "HRM only",       desc: "Human Resource Management students only" },
  { value: "GMP",     label: "GMP only",       desc: "General Management Programme students only" },
  { value: "BM_HRM",  label: "BM + HRM",       desc: "Open to both BM and HRM students" },
  { value: "BM_GMP",  label: "BM + GMP",       desc: "Open to both BM and GMP students" },
  { value: "HRM_GMP", label: "HRM + GMP",      desc: "Open to both HRM and GMP students" },
  { value: "ALL",     label: "All programmes", desc: "Open to every student regardless of programme" },
];

const TIE_BREAK_OPTIONS = [
  {
    value: "CQPI_DESC",
    label: "CQPI (highest first)",
    desc: "Student with higher CQPI / GPA wins the tie.",
    needsPrereq: false,
    needsSopWordLimit: false,
  },
  {
    value: "GRADE_DESC",
    label: "Grade in prerequisite course",
    desc: "Higher grade in a specified prerequisite course wins the tie.",
    needsPrereq: true,
    needsSopWordLimit: false,
  },
  {
    value: "COMPOSITE_RANK",
    label: "Composite ranking",
    desc: "Weighted combination of CQPI and other metrics (configured after cycle assignment).",
    needsPrereq: false,
    needsSopWordLimit: false,
  },
  {
    value: "LOTTERY",
    label: "Random lottery",
    desc: "A fair random draw is held among all tied students.",
    needsPrereq: false,
    needsSopWordLimit: false,
  },
  {
    value: "MANUAL_RANK",
    label: "Manual ranked list",
    desc: "You upload a ranked list of students before bidding opens.",
    needsPrereq: false,
    needsSopWordLimit: false,
  },
  {
    value: "SOP_SCORE",
    label: "Statement of Purpose (SOP)",
    desc: "Students submit a written SOP when applying. You read each SOP and assign a score (0–100). Seats are allocated in descending score order — bid points are not used.",
    needsPrereq: false,
    needsSopWordLimit: true,
  },
];

type Step = "details" | "tiebreak" | "attachments" | "done";

interface Attachment { id: string; fileName: string; fileUrl: string; fileSize: number | null }

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "details",     label: "Course Details" },
  { id: "tiebreak",    label: "Tie-break Policy" },
  { id: "attachments", label: "Attachments" },
];

export default function NewCoursePage() {
  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    title: "",
    credits: 3,
    termNumber: 5,
    defaultEligibility: "ALL",
    defaultSeatCap: 40,
    description: "",
    prerequisites: "",
    learningGoals: "",
    scheduleNotes: "",
  });

  const [tieBreak, setTieBreak] = useState({
    method: "CQPI_DESC",
    prereqCode: "",
    sopWordLimit: 300,
  });

  // Attachment state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField(k: string, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // ── Step 1 → create course ──────────────────────────────────────────────────
  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/professor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          credits: Number(form.credits),
          termNumber: Number(form.termNumber),
          defaultSeatCap: Number(form.defaultSeatCap),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create course");
      } else {
        setCreatedCourseId(data.id);
        setStep("tiebreak");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 → save tie-break preference ────────────────────────────────────
  async function handleSaveTieBreak(e: React.FormEvent) {
    e.preventDefault();
    if (!createdCourseId) return;

    // Client-side validation for SOP word limit
    if (tieBreak.method === "SOP_SCORE") {
      const limit = tieBreak.sopWordLimit;
      if (!limit || limit < SOP_WORD_LIMIT_MIN || limit > SOP_WORD_LIMIT_MAX) {
        setError(`SOP word limit must be between ${SOP_WORD_LIMIT_MIN} and ${SOP_WORD_LIMIT_MAX}.`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const selectedOpt = TIE_BREAK_OPTIONS.find((o) => o.value === tieBreak.method);
      const res = await fetch(`/api/professor/proposals/${createdCourseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultTieBreakMethod: tieBreak.method,
          defaultTieBreakPrereqCode: selectedOpt?.needsPrereq ? tieBreak.prereqCode : null,
          defaultSopWordLimit: selectedOpt?.needsSopWordLimit ? tieBreak.sopWordLimit : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save tie-break preference");
      } else {
        setStep("attachments");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !createdCourseId) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    for (const file of Array.from(files)) fd.append("files", file);
    try {
      const res = await fetch(`/api/professor/courses/${createdCourseId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
      } else {
        setAttachments((prev) => [...prev, ...(data as Attachment[])]);
      }
    } catch {
      setUploadError("Network error — please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(id: string) {
    if (!createdCourseId) return;
    try {
      await fetch(`/api/professor/courses/${createdCourseId}/attachments/${id}`, { method: "DELETE" });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (step === "done") {
    const tbLabel = TIE_BREAK_OPTIONS.find((o) => o.value === tieBreak.method)?.label ?? tieBreak.method;
    return (
      <div className="max-w-xl mx-auto mt-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Course Proposed!</h2>
          <p className="text-slate-500 mt-2">
            <strong>{form.title}</strong> ({form.code}) has been saved with tie-break preference:{" "}
            <strong>{tbLabel}</strong>
            {attachments.length > 0 && ` and ${attachments.length} attachment${attachments.length !== 1 ? "s" : ""}`}.
            Admin will link it to a bidding cycle.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/portal/professor/courses">
            <Button variant="primary">View My Courses</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setStep("details");
              setForm({ code: "", title: "", credits: 3, termNumber: 5, defaultEligibility: "ALL", defaultSeatCap: 40, description: "", prerequisites: "", learningGoals: "", scheduleNotes: "" });
              setTieBreak({ method: "CQPI_DESC", prereqCode: "", sopWordLimit: 300 });
              setCreatedCourseId(null);
              setAttachments([]);
            }}
          >
            Propose Another
          </Button>
        </div>
      </div>
    );
  }

  const currentStepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/professor/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> My Courses
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-indigo-600" />
            Propose New Course
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Fill in course details. Admin will link it to a bidding cycle.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done = i < currentStepIdx;
          const active = i === currentStepIdx;
          return (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-indigo-600 text-white"
                : done  ? "bg-emerald-100 text-emerald-700"
                :         "bg-slate-100 text-slate-400"
              }`}>
                <span className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                  {done ? "✓" : i + 1}
                </span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="w-6 h-0.5 bg-slate-200 mx-1" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Course Details ── */}
      {step === "details" && (
        <form onSubmit={handleCreateCourse} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Course Code <span className="text-red-500">*</span></Label>
                  <Input id="code" value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} placeholder="e.g. FIN-501" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="credits">Credits <span className="text-red-500">*</span></Label>
                  <Input id="credits" type="number" min={1} max={12} value={form.credits} onChange={(e) => setField("credits", parseInt(e.target.value) || 3)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Course Title <span className="text-red-500">*</span></Label>
                <Input id="title" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Corporate Finance & Valuation" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="termNumber">Term Offered <span className="text-red-500">*</span></Label>
                  <select id="termNumber" value={form.termNumber} onChange={(e) => setField("termNumber", parseInt(e.target.value))} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Term {n}</option>)}
                  </select>
                  <p className="text-xs text-slate-400">Which term of the programme</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultSeatCap">Seat Capacity <span className="text-red-500">*</span></Label>
                  <Input id="defaultSeatCap" type="number" min={1} max={1000} value={form.defaultSeatCap} onChange={(e) => setField("defaultSeatCap", parseInt(e.target.value) || 40)} required />
                  <p className="text-xs text-slate-400">Maximum students allowed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Programme Eligibility</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">Which student programmes can bid for this course?</p>
              <div className="grid grid-cols-2 gap-3">
                {ELIGIBILITY_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${form.defaultEligibility === opt.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"}`}>
                    <input type="radio" name="eligibility" value={opt.value} checked={form.defaultEligibility === opt.value} onChange={() => setField("defaultEligibility", opt.value)} className="mt-1 h-4 w-4 text-indigo-600" />
                    <div>
                      <p className={`text-sm font-semibold ${form.defaultEligibility === opt.value ? "text-indigo-800" : "text-slate-700"}`}>{opt.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Course Content</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="description">Course Description</Label>
                <textarea id="description" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} placeholder="Overview of the course, what students will learn…" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prerequisites">Prerequisites</Label>
                <Input id="prerequisites" value={form.prerequisites} onChange={(e) => setField("prerequisites", e.target.value)} placeholder="e.g. Financial Accounting, Corporate Finance" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="learningGoals">Learning Outcomes</Label>
                <textarea id="learningGoals" value={form.learningGoals} onChange={(e) => setField("learningGoals", e.target.value)} rows={3} placeholder="By the end of this course students will be able to…" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scheduleNotes">Schedule / Session Notes</Label>
                <Input id="scheduleNotes" value={form.scheduleNotes} onChange={(e) => setField("scheduleNotes", e.target.value)} placeholder="e.g. Mondays & Wednesdays 9:00–10:30 AM, Room 204" />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</span>
            ) : (
              <span className="flex items-center gap-1.5"><Save className="h-4 w-4" /> Save & Continue <ArrowRight className="h-4 w-4" /></span>
            )}
          </Button>
        </form>
      )}

      {/* ── Step 2: Tie-break Policy ── */}
      {step === "tiebreak" && (
        <form onSubmit={handleSaveTieBreak} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-500" />
                Tie-break Policy
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                When two students bid the same number of points, this rule decides who gets the seat.
                Your preference will be applied automatically when admin links this course to a cycle.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {TIE_BREAK_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    tieBreak.method === opt.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="tiebreak"
                    value={opt.value}
                    checked={tieBreak.method === opt.value}
                    onChange={() => setTieBreak((t) => ({ ...t, method: opt.value }))}
                    className="mt-1 h-4 w-4 text-indigo-600 shrink-0"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${tieBreak.method === opt.value ? "text-indigo-800" : "text-slate-700"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>

                    {/* Prerequisite course code input — only for GRADE_DESC */}
                    {opt.needsPrereq && tieBreak.method === opt.value && (
                      <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-xs">Prerequisite Course Code <span className="text-red-500">*</span></Label>
                        <Input
                          value={tieBreak.prereqCode}
                          onChange={(e) => setTieBreak((t) => ({ ...t, prereqCode: e.target.value.toUpperCase() }))}
                          placeholder="e.g. FIN-301"
                          required={tieBreak.method === "GRADE_DESC"}
                          className="max-w-xs"
                        />
                        <p className="text-xs text-slate-400">The course whose grade will be used to break ties.</p>
                      </div>
                    )}

                    {/* SOP word limit — only for SOP_SCORE */}
                    {opt.needsSopWordLimit && tieBreak.method === opt.value && (
                      <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-xs">
                          SOP Word Limit <span className="text-red-500">*</span>{" "}
                          <span className="text-slate-400 font-normal">({SOP_WORD_LIMIT_MIN}–{SOP_WORD_LIMIT_MAX} words)</span>
                        </Label>
                        <Input
                          type="number"
                          min={SOP_WORD_LIMIT_MIN}
                          max={SOP_WORD_LIMIT_MAX}
                          value={tieBreak.sopWordLimit}
                          onChange={(e) =>
                            setTieBreak((t) => ({ ...t, sopWordLimit: parseInt(e.target.value) || SOP_WORD_LIMIT_MIN }))
                          }
                          required={tieBreak.method === "SOP_SCORE"}
                          className="max-w-xs"
                        />
                        <p className="text-xs text-slate-400">
                          Students cannot submit an SOP longer than this. After applications close, you will score each SOP (0–100) and seats are allocated by score.
                        </p>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            This is your <strong>preferred</strong> policy — admin can adjust it before the bidding round opens.
          </div>

          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</span>
              ) : (
                <span className="flex items-center gap-1.5">Save & Continue <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep("attachments")}>
              Skip for now
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 3: Attachments ── */}
      {step === "attachments" && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{form.title}</p>
                  <p className="text-xs text-slate-500">
                    {form.code} · {form.credits} cr · Term {form.termNumber} ·{" "}
                    {ELIGIBILITY_OPTIONS.find(o => o.value === form.defaultEligibility)?.label} ·{" "}
                    {form.defaultSeatCap} seats ·{" "}
                    Tie-break: <span className="font-medium">{TIE_BREAK_OPTIONS.find(o => o.value === tieBreak.method)?.label}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File upload area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-indigo-500" />
                Attach Documents
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Upload any supporting materials — syllabus, reading lists, case studies, slides, etc.
                Any file type accepted, up to 50 MB per file. No limit on number of files.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{uploadError}</div>
              )}

              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length > 0 && fileInputRef.current) {
                    await handleFilesChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="text-sm text-slate-500">Uploading…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">Click to browse or drag & drop files here</p>
                    <p className="text-xs text-slate-400">Any file type · Up to 50 MB each · Multiple files supported</p>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesChange} />

              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{a.fileName}</p>
                          {a.fileSize && <p className="text-xs text-slate-400">{formatBytes(a.fileSize)}</p>}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleDeleteAttachment(a.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0 ml-2" title="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {attachments.length === 0 && !uploading && (
                <p className="text-xs text-center text-slate-400">No attachments yet — this step is optional.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="primary" disabled={uploading} onClick={() => setStep("done")}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {attachments.length > 0
                ? `Done — ${attachments.length} file${attachments.length !== 1 ? "s" : ""} attached`
                : "Done"}
            </Button>
            <Link href="/portal/professor/courses">
              <Button type="button" variant="ghost">Go to My Courses</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
