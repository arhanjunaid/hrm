"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Check, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  COMMUNICATION_INITIATED_BY,
  COMMUNICATION_INITIATED_BY_LABELS,
  COMMUNICATION_SOURCE_LABELS,
} from "@/lib/crm/constants";

interface ClientOpt {
  id: string;
  name: string;
  code: string;
  clientType: string | null;
}

interface CommSource {
  code: string;
  description: string;
}

interface CommFormState {
  contactDate: string;
  initiatedBy: string;
  source: string;
  description: string;
  actionRequired: string;
  dueDate: string;
}

const emptyCommForm = (defaultSource: string): CommFormState => ({
  contactDate: new Date().toISOString().slice(0, 10),
  initiatedBy: "RF",
  source: defaultSource,
  description: "",
  actionRequired: "",
  dueDate: "",
});

/**
 * "Add a new call log" flow for the Call Logs page.
 * Step 1 forces a Client/Prospect choice; step 2 is the log-entry form.
 */
export function AddCallLogModal({ clients }: { clients: ClientOpt[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [commSources, setCommSources] = useState<CommSource[]>([]);
  const [form, setForm] = useState<CommFormState>(emptyCommForm(""));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = clients.find((c) => c.id === clientId) ?? null;

  useEffect(() => {
    if (!isOpen) return;
    setClientId("");
    setForm(emptyCommForm(""));
    setFile(null);
    setError(null);
    // Global comm sources (client-scoped overrides resolve per client below).
    fetch("/api/dropdowns")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.commSources)) {
          setCommSources(data.commSources);
          setForm((p) => (p.source ? p : emptyCommForm(data.commSources[0]?.code ?? "")));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const sourceLabel = (code: string) =>
    commSources.find((s) => s.code === code)?.description ??
    COMMUNICATION_SOURCE_LABELS[code as keyof typeof COMMUNICATION_SOURCE_LABELS] ??
    code;

  const handleSave = async () => {
    if (!clientId) {
      setError("Please select a Client or a Prospect first.");
      return;
    }
    if (!form.contactDate) {
      setError("Date of contact is required.");
      return;
    }
    if (!form.source) {
      setError("Source is required.");
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("contactDate", form.contactDate);
      formData.append("initiatedBy", form.initiatedBy);
      formData.append("source", form.source);
      formData.append("description", form.description.trim());
      formData.append("actionRequired", form.actionRequired.trim());
      formData.append("dueDate", form.dueDate);
      if (file) formData.append("file", file);
      const res = await fetch(`/api/admin/clients/${clientId}/communications`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || "Failed to save.");
        return;
      }
      setIsOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl bg-[#7E8920] text-white hover:bg-[#6b7519] shadow-2xs transition-all"
      >
        <Plus className="w-4 h-4" /> Add a new call log
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[28px] shadow-2xl border border-slate-200/80 p-8 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Add a new call log</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {error}
              </p>
            )}

            {/* Step 1 — Client / Prospect (required before anything else) */}
            <SearchableSelect
              label="Client / Prospect"
              required
              value={clientId}
              onChange={setClientId}
              placeholder="— Select a Client or a Prospect —"
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.code}) — ${c.clientType === "P" ? "Prospect" : "Client"}`,
              }))}
            />

            {/* Step 2 — log entry, gated on step 1 */}
            {clientId ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Date of Contact *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.contactDate}
                    onChange={(e) => setForm((p) => ({ ...p, contactDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Initiated By *
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.initiatedBy}
                    onChange={(e) => setForm((p) => ({ ...p, initiatedBy: e.target.value }))}
                  >
                    {COMMUNICATION_INITIATED_BY.map((v) => (
                      <option key={v} value={v}>
                        {COMMUNICATION_INITIATED_BY_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Source *</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.source}
                    onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                  >
                    {commSources.length === 0 && <option value="">Loading sources…</option>}
                    {commSources.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.description}
                      </option>
                    ))}
                    {form.source && !commSources.some((s) => s.code === form.source) && (
                      <option value={form.source}>{sourceLabel(form.source)}</option>
                    )}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sources are maintained under{" "}
                    <Link
                      href="/admin/status-masters"
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Status Masters
                    </Link>
                    .
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="What was discussed…"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Action Required
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    value={form.actionRequired}
                    onChange={(e) => setForm((p) => ({ ...p, actionRequired: e.target.value }))}
                    placeholder="Next step and owner…"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Attach File (optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-xs text-slate-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-bold file:text-slate-700 file:bg-slate-50 hover:file:bg-slate-100 file:cursor-pointer"
                  />
                  {file && (
                    <p className="text-xs text-slate-500 mt-1">
                      Selected: <strong>{file.name}</strong>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                Select a Client or a Prospect above to log the call
                {selected ? ` for ${selected.name}` : ""}.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !clientId}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7E8920] text-white text-xs font-bold hover:bg-[#6b7519] disabled:opacity-60 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
