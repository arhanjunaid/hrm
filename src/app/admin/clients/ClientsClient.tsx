"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, X, Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  CRM_CLIENT_STATUSES,
  CRM_CLIENT_STATUS_LABELS,
  DEFAULT_CRM_CLIENT_STATUS,
} from "@/lib/crm/constants";

interface Client {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;
  status: string;
  crmStatus: string;
  clientType: string;
  createdAt: string | Date;
  projects: { id: string }[];
  jobDescriptions: { id: string }[];
  submissions: { id: string }[];
  users: { id: string }[];
}

type Mode = "clients" | "prospects";

const emptyForm = (mode: Mode) => ({
  name: "",
  code: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  status: "ACTIVE",
  crmStatus: DEFAULT_CRM_CLIENT_STATUS,
  clientType: mode === "prospects" ? "P" : "C",
});

export function ClientsClient({
  initialClients,
  mode = "clients",
}: {
  initialClients: Client[];
  mode?: Mode;
}) {
  const router = useRouter();
  const clients = initialClients;
  const [crmFilter, setCrmFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm(mode));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProspects = mode === "prospects";
  const noun = isProspects ? "Prospect" : "Client";
  const nounPlural = isProspects ? "Prospects" : "Clients";

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const visibleClients = clients.filter((c) => {
    if (crmFilter !== "ALL" && c.crmStatus !== crmFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.contactEmail.toLowerCase().includes(q) ||
      (c.contactName ?? "").toLowerCase().includes(q)
    );
  });

  // Auto-generate code from name
  const handleNameChange = (val: string) => {
    set("name", val);
    if (!form.code) {
      set("code", val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("Client name is required."); return; }
    if (!form.code.trim()) { setError("Client code is required."); return; }
    if (!form.contactEmail.trim()) { setError("Contact email is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error?.message || "Failed to create client."); return; }
      setShowForm(false);
      setForm(emptyForm(mode));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isProspects ? "Prospect Management" : "Client Management"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isProspects
              ? "Prospective clients and where each stands in the pipeline."
              : "Registered clients, their projects, contact information, and platform usage."}{" "}
            — {clients.length} total
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${nounPlural.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-2xs w-56"
            />
          </div>
          <select
            aria-label="Filter by prospect stage"
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={crmFilter}
            onChange={(e) => setCrmFilter(e.target.value)}
          >
            <option value="ALL">All stages</option>
            {CRM_CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CRM_CLIENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={() => { setForm(emptyForm(mode)); setError(null); setShowForm(true); }}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#7E8920] text-white hover:bg-[#6b7519] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> New {noun}
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl border border-slate-200/80 p-8 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">New {noun}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Client Name *</label>
                <input
                  autoFocus
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Client Code *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="e.g. ACME"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Type *</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.clientType}
                  onChange={(e) => set("clientType", e.target.value)}
                >
                  <option value="C">C — Client</option>
                  <option value="P">P — Prospect</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Status</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Prospect Stage</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.crmStatus}
                  onChange={(e) => set("crmStatus", e.target.value)}
                >
                  {CRM_CLIENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {CRM_CLIENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Contact Name</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Contact Email *</label>
                <input
                  type="email"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Contact Phone</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                  placeholder="+61 400 000 000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Optional notes about this client…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7E8920] text-white text-xs font-bold hover:bg-[#6b7519] disabled:opacity-60 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? "Creating…" : `Create ${noun}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[960px]">
            <thead className="border-b border-slate-200/80 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Projects</th>
                <th className="py-3 px-4 text-center">JDs</th>
                <th className="py-3 px-4 text-center">Users</th>
                <th className="py-3 px-4">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium text-sm">
                      {clients.length === 0 ? `No ${nounPlural.toLowerCase()} yet.` : `No ${nounPlural.toLowerCase()} match this filter.`}
                    </p>
                    {clients.length === 0 && (
                      <button onClick={() => setShowForm(true)} className="text-xs font-bold text-blue-600 hover:underline mt-1">
                        Create the first {noun.toLowerCase()} →
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="font-extrabold text-slate-900 hover:text-[#7E8920] hover:underline"
                      >
                        {client.name}
                      </Link>
                      {client.notes && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{client.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {client.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{client.contactName || "—"}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{client.contactEmail}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={client.crmStatus} size="sm">
                        {CRM_CLIENT_STATUS_LABELS[client.crmStatus as keyof typeof CRM_CLIENT_STATUS_LABELS] ?? client.crmStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={client.status} size="sm">{client.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{client.projects.length}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{client.jobDescriptions.length}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{client.users.length}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
