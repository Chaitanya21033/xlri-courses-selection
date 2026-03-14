"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Download, Users, GraduationCap, CheckCircle2,
  XCircle, AlertTriangle, FileText, Eye, EyeOff,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportedRow {
  name: string;
  email: string;
  role: string;
  password: string;
  employeeId?: string;
  rollNumber?: string;
  programme?: string;
  status: "created" | "skipped" | "error";
  error?: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  results: ImportedRow[];
}

// ── CSV Download helper ───────────────────────────────────────────────────────

function downloadCredentialsCSV(rows: ImportedRow[], label: string) {
  const isProfessor = label === "professors";
  const headers = isProfessor
    ? ["name", "email", "role", "password", "employee_id", "status", "note"]
    : ["name", "email", "role", "password", "roll_number", "programme", "status", "note"];

  const csvRows = rows.map((r) =>
    isProfessor
      ? [r.name, r.email, r.role, r.password, r.employeeId ?? "", r.status, r.error ?? ""]
      : [r.name, r.email, r.role, r.password, r.rollNumber ?? "", r.programme ?? "", r.status, r.error ?? ""]
  );

  const content = [headers, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sample CSV download ───────────────────────────────────────────────────────

function downloadSampleCSV(type: "professors" | "students") {
  const content =
    type === "professors"
      ? `name,email,employee_id,department,designation
Prof. Arun Kumar,arun.kumar@institution.ac.in,EMP001,Finance,Professor
Prof. Priya Sharma,priya.sharma@institution.ac.in,EMP002,Strategy,Associate Professor
Prof. Rahul Verma,rahul.verma@institution.ac.in,EMP003,Human Resources,Assistant Professor`
      : `name,email,roll_number,programme,academic_year,cqpi
Aarav Mehta,aarav.mehta@student.ac.in,BM2024001,BM,2024-26,7.8
Priya Singh,priya.singh@student.ac.in,BM2024002,BM,2024-26,8.2
Anika Patel,anika.patel@student.ac.in,HRM2024001,HRM,2024-26,7.5
Rohan Das,rohan.das@student.ac.in,HRM2024002,HRM,2024-26,6.9`;

  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sample-${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import Panel component ────────────────────────────────────────────────────

function ImportPanel({
  type,
  icon: Icon,
  title,
  description,
  fields,
  requiredFields,
}: {
  type: "professors" | "students";
  icon: React.ElementType;
  title: string;
  description: string;
  fields: string[];
  requiredFields: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileName(f?.name ?? null);
    setResult(null);
    setError(null);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please select a CSV file first."); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/admin/import/${type}`, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const createdRows = result?.results.filter((r) => r.status === "created") ?? [];
  const skippedRows = result?.results.filter((r) => r.status !== "created") ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-indigo-600" />
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadSampleCSV(type)}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Sample CSV
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field reference */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">CSV Column Reference</p>
          <div className="flex flex-wrap gap-1.5">
            {fields.map((f) => (
              <span
                key={f}
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  requiredFields.includes(f)
                    ? "bg-indigo-100 text-indigo-700 font-semibold"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {f}
                {requiredFields.includes(f) ? " *" : ""}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">* required columns</p>
        </div>

        {/* File picker */}
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
            <FileText className="h-5 w-5 text-slate-400" />
            <span className={`text-sm ${fileName ? "text-slate-700 font-medium" : "text-slate-400"}`}>
              {fileName ?? "Click to select CSV file…"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpload}
            disabled={loading || !fileName}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Import
              </span>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">{result.created} created</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold">{result.skipped} skipped</span>
                </div>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showPasswords ? "Hide" : "Show"} Passwords
                </Button>
                {createdRows.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => downloadCredentialsCSV(result.results, type)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download Credentials CSV
                  </Button>
                )}
              </div>
            </div>

            {/* ⚠ Security notice */}
            {createdRows.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Download and save the credentials CSV now.</strong> Passwords are shown only once and are not stored in plain text. After you leave this page, they cannot be recovered.
                </p>
              </div>
            )}

            {/* Credentials table */}
            {result.results.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Status</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Name</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Email</th>
                      {type === "professors" && (
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Employee ID</th>
                      )}
                      {type === "students" && (
                        <>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Roll No.</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Programme</th>
                        </>
                      )}
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 ${
                          row.status === "created"
                            ? "bg-white"
                            : "bg-red-50/50"
                        }`}
                      >
                        <td className="px-3 py-2">
                          {row.status === "created" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                              <CheckCircle2 className="h-2.5 w-2.5" /> created
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium" title={row.error}>
                              <XCircle className="h-2.5 w-2.5" /> {row.status}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.name}</td>
                        <td className="px-3 py-2 text-slate-600">{row.email}</td>
                        {type === "professors" && (
                          <td className="px-3 py-2 font-mono text-slate-500">{row.employeeId}</td>
                        )}
                        {type === "students" && (
                          <>
                            <td className="px-3 py-2 font-mono text-slate-500">{row.rollNumber}</td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                row.programme === "BM"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}>
                                {row.programme}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">
                          {row.status === "created" ? (
                            <span className={`font-mono ${showPasswords ? "text-slate-800" : "blur-sm select-none"}`}>
                              {row.password}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminImportPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-600" />
          Import Users
        </h1>
        <p className="text-slate-500 mt-1">
          Bulk-import professors and students via CSV. Passwords are auto-generated and available for one-time download.
        </p>
      </div>

      <ImportPanel
        type="professors"
        icon={Users}
        title="Import Professors"
        description="Creates professor accounts with auto-generated passwords. Download the credentials CSV immediately after import."
        fields={["name", "email", "employee_id", "department", "designation"]}
        requiredFields={["name", "email"]}
      />

      <ImportPanel
        type="students"
        icon={GraduationCap}
        title="Import Students"
        description="Creates student accounts. Students are auto-enrolled in the active bidding cycle. Programme must be BM or HRM."
        fields={["name", "email", "roll_number", "programme", "academic_year", "cqpi"]}
        requiredFields={["name", "email", "roll_number", "programme"]}
      />
    </div>
  );
}
