"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookMarked, Save, CheckCircle2, Paperclip, X, Upload, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

const ELIGIBILITY_OPTIONS = [
  { value: "BM",      label: "BM only",       desc: "Bachelor of Management students only" },
  { value: "HRM",     label: "HRM only",       desc: "Human Resource Management students only" },
  { value: "GMP",     label: "GMP only",       desc: "General Management Programme students only" },
  { value: "BM_HRM",  label: "BM + HRM",       desc: "Open to both BM and HRM students" },
  { value: "BM_GMP",  label: "BM + GMP",       desc: "Open to both BM and GMP students" },
  { value: "HRM_GMP", label: "HRM + GMP",      desc: "Open to both HRM and GMP students" },
  { value: "ALL",     label: "All programmes", desc: "Open to every student regardless of programme" },
];

interface Attachment { id: string; fileName: string; fileUrl: string; fileSize: number | null }

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewCoursePage() {
  const [step, setStep] = useState<"details" | "attachments" | "done" | string>("details");
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

  // ── Attachment state ────────────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(k: string, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // ── Step 1: Create the Course ───────────────────────────────────────────────
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
    for (const file of Array.from(files)) {
      fd.append("files", file);
    }

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
      // reset input so the same file can be re-added if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(id: string) {
    if (!createdCourseId) return;
    try {
      await fetch(`/api/professor/courses/${createdCourseId}/attachments/${id}`, {
        method: "DELETE",
      });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently ignore
    }
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (step === "done") {
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
            <strong>{form.title}</strong> ({form.code}) has been saved
            {attachments.length > 0 && ` with ${attachments.length} attachment${attachments.length !== 1 ? "s" : ""}`}.
            The admin will link it to a bidding cycle.
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

  // ── Step indicator ─────────────────────────────────────────────────────────
  const steps = [
    { id: "details",     label: "Course Details" },
    { id: "attachments", label: "Attachments" },
  ];

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

      {/* Step tabs */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === s.id
                ? "bg-indigo-600 text-white"
                : step === "done" || (step === "attachments" && s.id === "details")
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-400"
            }`}>
              <span className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <div className="w-6 h-0.5 bg-slate-200 mx-1" />}
          </div>
        ))}
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
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    placeholder="e.g. FIN-501"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="credits">Credits <span className="text-red-500">*</span></Label>
                  <Input
                    id="credits"
                    type="number"
                    min={1}
                    max={12}
                    value={form.credits}
                    onChange={(e) => set("credits", parseInt(e.target.value) || 3)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Course Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Corporate Finance & Valuation"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="termNumber">Term Offered <span className="text-red-500">*</span></Label>
                  <select
                    id="termNumber"
                    value={form.termNumber}
                    onChange={(e) => set("termNumber", parseInt(e.target.value))}
                    className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {[1,2,3,4,5,6].map(n => (
                      <option key={n} value={n}>Term {n}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400">Which term of the programme</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultSeatCap">Seat Capacity <span className="text-red-500">*</span></Label>
                  <Input
                    id="defaultSeatCap"
                    type="number"
                    min={1}
                    max={1000}
                    value={form.defaultSeatCap}
                    onChange={(e) => set("defaultSeatCap", parseInt(e.target.value) || 40)}
                    required
                  />
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
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      form.defaultEligibility === opt.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="eligibility"
                      value={opt.value}
                      checked={form.defaultEligibility === opt.value}
                      onChange={() => set("defaultEligibility", opt.value)}
                      className="mt-1 h-4 w-4 text-indigo-600"
                    />
                    <div>
                      <p className={`text-sm font-semibold ${form.defaultEligibility === opt.value ? "text-indigo-800" : "text-slate-700"}`}>
                        {opt.label}
                      </p>
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
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder="Overview of the course, what students will learn…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prerequisites">Prerequisites</Label>
                <Input
                  id="prerequisites"
                  value={form.prerequisites}
                  onChange={(e) => set("prerequisites", e.target.value)}
                  placeholder="e.g. Financial Accounting, Corporate Finance"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="learningGoals">Learning Outcomes</Label>
                <textarea
                  id="learningGoals"
                  value={form.learningGoals}
                  onChange={(e) => set("learningGoals", e.target.value)}
                  rows={3}
                  placeholder="By the end of this course students will be able to…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scheduleNotes">Schedule / Session Notes</Label>
                <Input
                  id="scheduleNotes"
                  value={form.scheduleNotes}
                  onChange={(e) => set("scheduleNotes", e.target.value)}
                  placeholder="e.g. Mondays & Wednesdays 9:00–10:30 AM, Room 204"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="h-4 w-4" /> Save & Continue
              </span>
            )}
          </Button>
        </form>
      )}

      {/* ── Step 2: Attachments ── */}
      {step === "attachments" && (
        <div className="space-y-6">
          {/* Course saved confirmation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{form.title}</p>
                  <p className="text-xs text-slate-500">
                    {form.code} · {form.credits} credits · Term {form.termNumber} ·{" "}
                    {ELIGIBILITY_OPTIONS.find(o => o.value === form.defaultEligibility)?.label} ·{" "}
                    {form.defaultSeatCap} seats
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

              {/* Drop zone / picker */}
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const dt = e.dataTransfer;
                  if (dt.files.length > 0 && fileInputRef.current) {
                    // Trigger the same upload path via a synthetic change
                    const syntheticEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
                    await handleFilesChange(syntheticEvent);
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
                    <p className="text-sm font-medium text-slate-600">
                      Click to browse or drag & drop files here
                    </p>
                    <p className="text-xs text-slate-400">Any file type · Up to 50 MB each · Multiple files supported</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFilesChange}
              />

              {/* Uploaded files list */}
              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{a.fileName}</p>
                          {a.fileSize && (
                            <p className="text-xs text-slate-400">{formatBytes(a.fileSize)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0 ml-2"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {attachments.length === 0 && !uploading && (
                <p className="text-xs text-center text-slate-400">
                  No attachments yet — this step is optional.
                </p>
              )}
            </CardContent>
          </Card>

          {/* What happens next */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
            <p className="font-semibold mb-1">What happens next</p>
            <ol className="list-decimal list-inside space-y-1 text-indigo-700">
              <li>Admin will link this course to an active bidding cycle</li>
              <li>Once linked, visit <strong>My Courses</strong> to set the tie-break policy and upload the course outline</li>
              <li>Admin opens the bidding round — students start bidding</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Button
              variant="primary"
              disabled={uploading}
              onClick={() => setStep("done")}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {attachments.length > 0 ? `Done — ${attachments.length} file${attachments.length !== 1 ? "s" : ""} attached` : "Done"}
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
