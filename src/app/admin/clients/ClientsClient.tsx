"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, Mail, Phone, Calendar, FolderOpen,
  ChevronRight, Plus, X, Check, IdCard,
} from "lucide-react";
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
  createdAt: string | Date;
  projects: { id: string }[];
  jobDescriptions: { id: string }[];
  submissions: { id: string }[];
  users: { id: string }[];
}

const emptyForm = {
  name: "",
  code: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  status: "ACTIVE",
  crmStatus: DEFAULT_CRM_CLIENT_STATUS,
};

export function ClientsClient({ initialClients }: { initialClients: Client[] }) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [crmFilter, setCrmFilter] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const visibleClients = crmFilter === "ALL"
    ? clients
    : clients.filter((c) => c.crmStatus === crmFilter);

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
      setForm(emptyForm);
      // Refresh via router to re-fetch server data
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
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Client Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Registered clients, their projects, contact information, and platform usage.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={() => { setForm(emptyForm); setError(null); setShowForm(true); }}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#7E8920] text-white hover:bg-[#6b7519] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Client
          </button>
        </div>
      </div>

      {/* Create Client Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl border border-slate-200/80 p-8 w-full max-w-lg space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">New Client</h3>
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
              <div className="md:col-span-2">
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
                {saving ? "Creating…" : "Create Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Cards Grid */}
      {visibleClients.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-2xs p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 font-medium text-sm">
            {clients.length === 0 ? "No clients yet." : "No clients in this stage."}
          </p>
          {clients.length === 0 && (
            <button onClick={() => setShowForm(true)} className="text-xs font-bold text-blue-600 hover:underline">
              Create the first client →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xs p-6 flex flex-col justify-between hover-lift"
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                    {client.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge status={client.crmStatus} size="sm">
                      {CRM_CLIENT_STATUS_LABELS[client.crmStatus as keyof typeof CRM_CLIENT_STATUS_LABELS] ?? client.crmStatus}
                    </Badge>
                    <Badge status={client.status} size="sm">{client.status}</Badge>
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{client.name}</h3>
                {client.contactName && (
                  <p className="text-xs text-slate-500 mt-0.5">Contact: {client.contactName}</p>
                )}
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {client.notes || "Registered client."}
                </p>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{client.contactEmail}</span>
                  </div>
                  {client.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{client.contactPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Added {new Date(client.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span><strong className="text-slate-900">{client.projects.length}</strong> Projects</span>
                  <span><strong className="text-slate-900">{client.users.length}</strong> Users</span>
                  <span><strong className="text-slate-900">{client.jobDescriptions.length}</strong> JDs</span>
                </div>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    Profile, Contract & Log
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href={`/admin/clients/${client.id}/projects`}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    Manage Projects
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href={`/admin/clients/${client.id}/users`}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Manage Users
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
