"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Setting {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}

interface Props {
  settings: Setting[];
}

export function SettingsEditor({ settings }: Props) {
  const router = useRouter();
  const [editValues, setEditValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(key: string, value: string) {
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Save failed.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(null);
    }
  }

  async function addNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) { setError("Key is required."); return; }
    await save(newKey.trim(), newValue.trim());
    setNewKey("");
    setNewValue("");
    setAddingNew(false);
  }

  return (
    <div className="space-y-3">
      {settings.map((s) => (
        <div key={s.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <code className="text-xs font-mono text-slate-700 w-48 shrink-0">{s.key}</code>
          <input
            type="text"
            value={editValues[s.key] ?? s.value}
            onChange={(e) =>
              setEditValues((prev) => ({ ...prev, [s.key]: e.target.value }))
            }
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => save(s.key, editValues[s.key] ?? s.value)}
            disabled={saving === s.key}
          >
            {saving === s.key ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
        </div>
      ))}

      {addingNew ? (
        <form onSubmit={addNew} className="flex items-center gap-3 p-3 border border-dashed border-indigo-200 rounded-lg bg-indigo-50/40">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="setting.key"
            className="w-48 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="value"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <Button type="submit" size="sm" variant="primary" className="h-7 px-3 text-xs" disabled={!!saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAddingNew(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-slate-500 border border-dashed border-slate-200"
          onClick={() => setAddingNew(true)}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Setting
        </Button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
