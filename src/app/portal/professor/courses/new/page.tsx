"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookMarked, Save, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Eligibility option definitions
const ELIGIBILITY_OPTIONS = [
  { value: "BM",      label: "BM only",          desc: "Bachelor of Management students only" },
  { value: "HRM",     label: "HRM only",          desc: "Human Resource Management students only" },
  { value: "GMP",     label: "GMP only",          desc: "General Management Programme students only" },
  { value: "BM_HRM",  label: "BM + HRM",          desc: "Open to both BM and HRM students" },
  { value: "BM_GMP",  label: "BM + GMP",          desc: "Open to both BM and GMP students" },
  { value: "HRM_GMP", label: "HRM + GMP",         desc: "Open to both HRM and GMP students" },
  { value: "ALL",     label: "All programmes",    desc: "Open to every student regardless of programme" },
];

const TIE_BREAK_OPTIONS = [
  { value: "CQPI_DESC",      label: "CQPI (highest first)",       desc: "Student with higher CQPI/GPA wins the tie" },
  { value: "GRADE_DESC",     label: "Grade in prerequisite",       desc: "Higher grade in a specified prerequisite course wins" },
  { value: "COMPOSITE_RANK", label: "Composite ranking",           desc: "Weighted combination of CQPI and other metrics" },
  { value: "LOTTERY",        label: "Random lottery",              desc: "Fair random draw among tied students" },
  { value: "MANUAL_RANK",    label: "Manual ranked list",          desc: "You upload a ranked list of students before bidding opens" },
];

export default function NewCoursePage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "policy" | "done">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Core
    code: "",
    title: "",
    credits: 3,
    termNumber: 5,
    defaultEligibility: "ALL",
    defaultSeatCap: 40,
    // Details
    description: "",
    prerequisites: "",
    learningGoals: "",
    scheduleNotes: "",
  });

  const [tieBreak, setTieBreak] = useState({
    method: "CQPI_DESC",
    prerequisiteCourseCode: "",
  });

  function set(k: string, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // ── Step 1: Create the Course ────────────────────────────────────────────
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
        setStep("policy");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Set Tie-break Policy ─────────────────────────────────────────
  async function handleSetTieBreak(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Tie-break is set per CourseOffering, not Course.
    // We skip it here and note that admin will set it when linking to a cycle.
    // Professor can set it later from the course offering detail page.
    setStep("done");
    setLoading(false);
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Course Created!</h2>
          <p className="text-slate-500 mt-2">
            <strong>{form.title}</strong> ({form.code}) has been saved as a course proposal.
            The admin will link it to a bidding cycle. Once linked, you can set the tie-break
            policy and upload your course outline from <strong>My Courses</strong>.
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
            }}
          >
            Create Another Course
          </Button>
        </div>
      </div>
    );
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  const steps = [
    { id: "details", label: "Course Details" },
    { id: "policy",  label: "Confirm" },
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
                : (steps.indexOf(steps.find(x => x.id === step)!) > i)
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-400"
            }`}>
              <span className="h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold
                border-current">{i + 1}</span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className="w-6 h-0.5 bg-slate-200 mx-1" />
            )}
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
            <CardHeader>
              <CardTitle>Programme Eligibility</CardTitle>
            </CardHeader>
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
                <Save className="h-4 w-4" /> Save Course
              </span>
            )}
          </Button>
        </form>
      )}

      {/* ── Step 2: Confirmation ── */}
      {step === "policy" && (
        <form onSubmit={handleSetTieBreak} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Course Saved ✓</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="font-semibold text-emerald-800">{form.title}</p>
                <p className="text-sm text-emerald-700 mt-1">
                  Code: {form.code} · {form.credits} credits · Term {form.termNumber} ·
                  Eligibility: {ELIGIBILITY_OPTIONS.find(o => o.value === form.defaultEligibility)?.label} ·
                  Capacity: {form.defaultSeatCap} students
                </p>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
                <p className="font-semibold mb-1">What happens next</p>
                <ol className="list-decimal list-inside space-y-1 text-indigo-700">
                  <li>Admin will link this course to an active bidding cycle</li>
                  <li>Once linked, come back to <strong>My Courses</strong> to:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                      <li>Upload your course outline document (PDF/Word)</li>
                      <li>Set the tie-break policy (required before bidding opens)</li>
                      <li>Edit any course details</li>
                    </ul>
                  </li>
                  <li>Admin opens the bidding round — students start bidding</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" variant="primary">
              Done
            </Button>
            <Link href="/portal/professor/courses">
              <Button type="button" variant="ghost">Go to My Courses</Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
