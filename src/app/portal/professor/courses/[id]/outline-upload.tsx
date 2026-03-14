"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Upload, FileText, Trash2, ExternalLink, AlertCircle } from "lucide-react";

interface OutlineUploadProps {
  offeringId: string;
  existingUrl: string | null;
  existingName: string | null;
}

export function OutlineUpload({ offeringId, existingUrl, existingName }: OutlineUploadProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileName(f?.name ?? null);
    setError(null);
    setSuccess(null);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Select a file first."); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/professor/courses/${offeringId}/outline`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setSuccess(`Uploaded: ${data.fileName}`);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove the course outline document?")) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/professor/courses/${offeringId}/outline`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Delete failed");
      } else {
        setSuccess("Outline removed.");
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Upload a course outline, syllabus, or reading list (PDF, Word, or PowerPoint — max 10 MB).
        Students will be able to download this from the course catalog.
      </p>

      {/* Current file */}
      {existingUrl && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 truncate">
              {existingName ?? "Course Outline"}
            </p>
            <p className="text-xs text-emerald-600">Currently uploaded</p>
          </div>
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload new */}
      <div className="flex items-center gap-3">
        <label className="flex-1 flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
          <FileText className="h-5 w-5 text-slate-400" />
          <span className={`text-sm ${fileName ? "text-slate-700 font-medium" : "text-slate-400"}`}>
            {fileName ?? (existingUrl ? "Replace with new file…" : "Click to select PDF / Word / PPT…")}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            className="sr-only"
            onChange={handleChange}
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
              Uploading…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </span>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <p className="text-sm text-emerald-700 font-medium">{success}</p>
      )}
    </div>
  );
}
