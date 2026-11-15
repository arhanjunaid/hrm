"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Building2, Mail, Phone, Calendar, FileText,
  Eye, Upload, Plus, Pencil, Trash2, X, Check,
  FolderOpen, Users, Paperclip,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  CRM_CLIENT_STATUSES,
  CRM_CLIENT_STATUS_LABELS,
  COMMUNICATION_INITIATED_BY,
  COMMUNICATION_INITIATED_BY_LABELS,
  COMMUNICATION_SOURCE_LABELS,
} from "@/lib/crm/constants";

interface Communication {
  id: string;
  contactDate: string;
  initiatedBy: string;
  source: string;
  description: string;
  actionRequired: string | null;
  dueDate: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdByUser?: { name: string; email: string } | null;
}

interface CommSource {
  code: string;
  description: string;
}

interface ClientDetail {
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
  contractFileName: string | null;
  contractMimeType: string | null;
  contractFileSize: number | null;
  contractUploadedAt: string | null;
  createdAt: string;
  communications: Communication[];
  projects: { id: string; name: string }[];
  users: { id: string; name: string; email: string }[];
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(typeof value === "string" && value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ClientDetailClient({ initialClient }: { initialClient: ClientDetail }) {
  const [client, setClient] = useState<ClientDetail>(initialClient);
  const [crmStatus, setCrmStatus] = useState(initialClient.crmStatus);
  const [platformStatus, setPlatformStatus] = useState(initialClient.status);
  const [clientType, setClientType] = useState(initialClient.clientType ?? "C");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [contractMsg, setContractMsg] = useState<string | null>(null);

  const [comms, setComms] = useState<Communication[]>(initialClient.communications);
  const [commSources, setCommSources] = useState<CommSource[]>([]);
  const [showCommForm, setShowCommForm] = useState(false);
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [commForm, setCommForm] = useState<CommFormState>(emptyCommForm(""));
  const [commFile, setCommFile] = useState<File | null>(null);
  const [commRemoveFile, setCommRemoveFile] = useState(false);
  const [editingCommFileName, setEditingCommFileName] = useState<string | null>(null);
  const [savingComm, setSavingComm] = useState(false);
  const [commError, setCommError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/dropdowns?clientId=${encodeURIComponent(client.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.commSources)) {
          setCommSources(data.commSources);
          setCommForm((p) => (p.source ? p : emptyCommForm(data.commSources[0]?.code ?? "")));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const sourceLabel = (code: string) =>
    commSources.find((s) => s.code === code)?.description ??
    COMMUNICATION_SOURCE_LABELS[code as keyof typeof COMMUNICATION_SOURCE_LABELS] ??
    code;

  const refreshComms = async () => {
    const res = await fetch(`/api/admin/clients/${client.id}/communications`);
    const data = await res.json();
    if (data.success) setComms(data.data);
  };

  const handleStatusSave = async () => {
    setSavingStatus(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmStatus, status: platformStatus, clientType }),
      });
      const data = await res.json();
      if (!data.success) { setStatusMsg(data.error?.message || "Failed to update."); return; }
      setClient((p) => ({ ...p, crmStatus, status: platformStatus, clientType }));
      setStatusMsg("Saved.");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleContractUpload = async () => {
    if (!contractFile) { setContractMsg("Choose a contract file first (PDF, DOC, DOCX)."); return; }
    setUploading(true);
    setContractMsg(null);
    try {
      const formData = new FormData();
      formData.append("contract", contractFile);
      const res = await fetch(`/api/admin/clients/${client.id}/contract`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) { setContractMsg(data.error?.message || "Upload failed."); return; }
      setContractFile(null);
      setClient((p) => ({
        ...p,
        contractFileName: contractFile.name,
        contractMimeType: contractFile.type || p.contractMimeType,
        contractFileSize: contractFile.size,
        contractUploadedAt: new Date().toISOString(),
      }));
      setContractMsg("Contract uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const openCommCreate = () => {
    setEditingCommId(null);
    setCommForm(emptyCommForm(commSources[0]?.code ?? ""));
    setCommFile(null);
    setCommRemoveFile(false);
    setEditingCommFileName(null);
    setCommError(null);
    setShowCommForm(true);
  };

  const openCommEdit = (c: Communication) => {
    setEditingCommId(c.id);
    setCommForm({
      contactDate: String(c.contactDate).slice(0, 10),
      initiatedBy: c.initiatedBy,
      source: c.source,
      description: c.description,
      actionRequired: c.actionRequired ?? "",
      dueDate: c.dueDate ? String(c.dueDate).slice(0, 10) : "",
    });
    setCommFile(null);
    setCommRemoveFile(false);
    setEditingCommFileName(c.fileName);
    setCommError(null);
    setShowCommForm(true);
  };

  const handleCommSave = async () => {
    if (!commForm.contactDate) { setCommError("Date of contact is required."); return; }
    if (!commForm.source) { setCommError("Source is required."); return; }
    if (!commForm.description.trim()) { setCommError("Description is required."); return; }
    setSavingComm(true);
    setCommError(null);
    try {
      const url = editingCommId
        ? `/api/admin/clients/${client.id}/communications/${editingCommId}`
        : `/api/admin/clients/${client.id}/communications`;
      const formData = new FormData();
      formData.append("contactDate", commForm.contactDate);
      formData.append("initiatedBy", commForm.initiatedBy);
      formData.append("source", commForm.source);
      formData.append("description", commForm.description.trim());
      formData.append("actionRequired", commForm.actionRequired.trim());
      formData.append("dueDate", commForm.dueDate);
      if (commFile) formData.append("file", commFile);
      if (commRemoveFile) formData.append("removeFile", "true");
      const res = await fetch(url, {
        method: editingCommId ? "PATCH" : "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) { setCommError(data.error?.message || "Failed to save."); return; }
      setShowCommForm(false);
      setCommFile(null);
      setCommRemoveFile(false);
      refreshComms();
    } finally {
      setSavingComm(false);
    }
  };

  const handleCommDelete = async (commId: string) => {
    if (!confirm("Delete this log entry? This cannot be undone.")) return;
    await fetch(`/api/admin/clients/${client.id}/communications/${commId}`, { method: "DELETE" });
    refreshComms();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={client.clientType === "P" ? "/admin/prospects" : "/admin/clients"}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">{client.name}</h2>
              <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                {client.code}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge status={client.crmStatus}>
                {CRM_CLIENT_STATUS_LABELS[client.crmStatus as keyof typeof CRM_CLIENT_STATUS_LABELS] ?? client.crmStatus}
              </Badge>
              <Badge status={client.status}>{client.status}</Badge>
              <Badge variant={client.clientType === "P" ? "purple" : "blue"}>
                {client.clientType === "P" ? "Prospect" : "Client"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/clients/${client.id}/projects`}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
          >
            <FolderOpen className="w-4 h-4" /> Manage Projects
          </Link>
          <Link
            href={`/admin/clients/${client.id}/users`}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
          >
            <Users className="w-4 h-4" /> Manage Users
          </Link>
        </div>
      </div>

      {/* Profile + stage */}
      <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xs p-6">
        <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" /> Client Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div>
            <p className="font-extrabold text-slate-400 mb-1">CONTACT</p>
            <p className="font-bold text-slate-800">{client.contactName || "—"}</p>
            <p className="flex items-center gap-1.5 mt-1 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {client.contactEmail}
            </p>
            {client.contactPhone && (
              <p className="flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {client.contactPhone}
              </p>
            )}
          </div>
          <div>
            <p className="font-extrabold text-slate-400 mb-1">PLATFORM</p>
            <p><strong className="text-slate-900">{client.projects.length}</strong> Projects</p>
            <p className="mt-1"><strong className="text-slate-900">{client.users.length}</strong> Users</p>
            <p className="flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Added {formatDate(client.createdAt)}
            </p>
          </div>
          <div>
            <p className="font-extrabold text-slate-400 mb-1">NOTES</p>
            <p className="text-slate-600">{client.notes || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 items-end">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">Type</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
            >
              <option value="C">C — Client</option>
              <option value="P">P — Prospect</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">Prospect Stage</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={crmStatus}
              onChange={(e) => setCrmStatus(e.target.value)}
            >
              {CRM_CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>{CRM_CLIENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">Platform Status</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={platformStatus}
              onChange={(e) => setPlatformStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStatusSave}
              disabled={savingStatus}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#7E8920] text-white text-xs font-bold hover:bg-[#6b7519] disabled:opacity-60 transition-all"
            >
              <Check className="w-3.5 h-3.5" /> {savingStatus ? "Saving…" : "Save"}
            </button>
            {statusMsg && <span className="text-xs font-bold text-slate-500">{statusMsg}</span>}
          </div>
        </div>
      </div>

      {/* Signed contract */}
      <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xs p-6">
        <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" /> Signed Contract
        </h3>
        {client.contractFileName ? (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{client.contractFileName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatBytes(client.contractFileSize)}
                {client.contractUploadedAt ? ` · Uploaded ${formatDate(client.contractUploadedAt)}` : ""}
              </p>
            </div>
            <a
              href={`/api/admin/clients/${client.id}/contract`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </a>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No signed contract uploaded yet.</p>
        )}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
            className="text-xs text-slate-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-bold file:text-slate-700 file:bg-slate-50 hover:file:bg-slate-100 file:cursor-pointer"
          />
          <button
            onClick={handleContractUpload}
            disabled={uploading || !contractFile}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7E8920] text-white text-xs font-bold hover:bg-[#6b7519] disabled:opacity-60 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading…" : client.contractFileName ? "Replace" : "Upload"}
          </button>
          {contractMsg && <span className="text-xs font-bold text-slate-500">{contractMsg}</span>}
        </div>
      </div>

      {/* Communication log */}
      <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xs p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900">Communication Log</h3>
          <button
            onClick={openCommCreate}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#7E8920] text-white hover:bg-[#6b7519] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Log Contact
          </button>
        </div>
        {comms.length === 0 ? (
          <p className="text-xs text-slate-500">No contacts logged yet. Record the first touchpoint from the day the lead was received.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-xs min-w-[860px]">
              <thead>
                <tr className="text-left text-slate-400 font-extrabold border-b border-slate-100">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Initiated By</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Action Required</th>
                  <th className="py-2 pr-3">Due Date</th>
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {comms.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 align-top">
                    <td className="py-2.5 pr-3 font-bold text-slate-800 whitespace-nowrap">{formatDate(c.contactDate)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {COMMUNICATION_INITIATED_BY_LABELS[c.initiatedBy as keyof typeof COMMUNICATION_INITIATED_BY_LABELS] ?? c.initiatedBy}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {sourceLabel(c.source)}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 max-w-[280px]">{c.description}</td>
                    <td className="py-2.5 pr-3 text-slate-600 max-w-[200px]">{c.actionRequired || "—"}</td>
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{formatDate(c.dueDate)}</td>
                    <td className="py-2.5 pr-3 text-slate-600 max-w-[160px]">
                      {c.fileName ? (
                        <a
                          href={`/api/admin/clients/${client.id}/communications/${c.id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                          title={c.fileName}
                        >
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.fileName}</span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => openCommEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Edit entry">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleCommDelete(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label="Delete entry">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Communication modal */}
      {showCommForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl border border-slate-200/80 p-8 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingCommId ? "Edit Log Entry" : "Log Contact"}
              </h3>
              <button onClick={() => setShowCommForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            {commError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-200">{commError}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Date of Contact *</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={commForm.contactDate}
                  onChange={(e) => setCommForm((p) => ({ ...p, contactDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={commForm.dueDate}
                  onChange={(e) => setCommForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Initiated By *</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={commForm.initiatedBy}
                  onChange={(e) => setCommForm((p) => ({ ...p, initiatedBy: e.target.value }))}
                >
                  {COMMUNICATION_INITIATED_BY.map((v) => (
                    <option key={v} value={v}>{COMMUNICATION_INITIATED_BY_LABELS[v]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Source *</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={commForm.source}
                  onChange={(e) => setCommForm((p) => ({ ...p, source: e.target.value }))}
                >
                  {commSources.length === 0 && <option value="">Loading sources…</option>}
                  {commSources.map((s) => (
                    <option key={s.code} value={s.code}>{s.description}</option>
                  ))}
                  {commForm.source && !commSources.some((s) => s.code === commForm.source) && (
                    <option value={commForm.source}>{sourceLabel(commForm.source)}</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sources are maintained under <Link href="/admin/status-masters" className="text-blue-600 hover:underline font-bold">Status Masters</Link>.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                  value={commForm.description}
                  onChange={(e) => setCommForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What was discussed…"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Action Required</label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                  value={commForm.actionRequired}
                  onChange={(e) => setCommForm((p) => ({ ...p, actionRequired: e.target.value }))}
                  placeholder="Next step and owner…"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Attach File (optional)</label>
                {editingCommId && editingCommFileName && !commRemoveFile && !commFile && (
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 rounded-lg px-2.5 py-1.5">
                      <Paperclip className="w-3.5 h-3.5" /> {editingCommFileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCommRemoveFile(true)}
                      className="font-bold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {commRemoveFile && !commFile && (
                  <p className="text-xs text-amber-700 font-semibold mb-2">
                    Current file will be removed on save.{" "}
                    <button type="button" onClick={() => setCommRemoveFile(false)} className="underline">
                      Undo
                    </button>
                  </p>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => { setCommFile(e.target.files?.[0] ?? null); setCommRemoveFile(false); }}
                  className="text-xs text-slate-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-bold file:text-slate-700 file:bg-slate-50 hover:file:bg-slate-100 file:cursor-pointer"
                />
                {commFile && (
                  <p className="text-xs text-slate-500 mt-1">Selected: <strong>{commFile.name}</strong></p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setShowCommForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleCommSave}
                disabled={savingComm}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7E8920] text-white text-xs font-bold hover:bg-[#6b7519] disabled:opacity-60 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {savingComm ? "Saving…" : editingCommId ? "Save Changes" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
