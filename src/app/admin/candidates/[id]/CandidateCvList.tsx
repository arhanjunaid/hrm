"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Archive, ArchiveRestore, Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { ResumePreviewModal } from "@/components/ui/ResumePreviewModal";

export interface CvRow {
  id: string;
  fileName: string;
  description: string | null;
  isObsolete: boolean;
  createdAt: string | Date;
  fileSize: number;
}

export function CandidateCvList({
  candidateId,
  candidateName,
  initialCvs,
}: {
  candidateId: string;
  candidateName: string;
  initialCvs: CvRow[];
}) {
  const router = useRouter();
  const [cvs, setCvs] = useState<CvRow[]>(initialCvs);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; title: string; message?: string } | null>(null);

  const friendly = (message?: string) => message?.replace(/^[A-Z0-9_]+:\s*/, "") || message;

  const handleUpload = async () => {
    if (!file) {
      setToast({ type: "error", title: "No file chosen", message: "Choose a CV file to upload (PDF, DOC, DOCX)." });
      return;
    }
    setUploading(true);
    setToast(null);
    try {
      const data = new FormData();
      data.append("resume", file);
      data.append("description", description);
      const res = await fetch(`/api/admin/candidates/${candidateId}/cvs`, { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setToast({ type: "error", title: "Upload failed", message: friendly(json.error?.message) || "Could not upload CV." });
        return;
      }
      setCvs((prev) => [
        {
          id: json.data.fileId,
          fileName: file.name,
          description: description.trim() || null,
          isObsolete: false,
          createdAt: new Date().toISOString(),
          fileSize: file.size,
        },
        ...prev,
      ]);
      setFile(null);
      setDescription("");
      setToast({ type: "success", title: "CV uploaded" });
      router.refresh();
    } catch {
      setToast({ type: "error", title: "Network error", message: "Failed to upload CV." });
    } finally {
      setUploading(false);
    }
  };

  const handleObsolete = async (cv: CvRow) => {
    const toObsolete = !cv.isObsolete;
    if (toObsolete && !confirm(`Mark "${cv.fileName}" as obsolete? It can no longer be submitted to new JDs.`)) return;
    setBusyId(cv.id);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}/cvs/${cv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isObsolete: toObsolete }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setToast({ type: "error", title: "Update failed", message: friendly(json.error?.message) || "Could not update CV." });
        return;
      }
      setCvs((prev) => prev.map((c) => (c.id === cv.id ? { ...c, isObsolete: toObsolete } : c)));
      setToast({ type: "success", title: toObsolete ? "CV marked obsolete" : "CV restored" });
      router.refresh();
    } catch {
      setToast({ type: "error", title: "Network error", message: "Failed to update CV." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cv: CvRow) => {
    if (!confirm(`Delete "${cv.fileName}"? This cannot be undone.`)) return;
    setBusyId(cv.id);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}/cvs/${cv.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setToast({ type: "error", title: "Delete failed", message: friendly(json.error?.message) || "Could not delete CV." });
        return;
      }
      setCvs((prev) => prev.filter((c) => c.id !== cv.id));
      setToast({ type: "success", title: "CV deleted" });
      router.refresh();
    } catch {
      setToast({ type: "error", title: "Network error", message: "Failed to delete CV." });
    } finally {
      setBusyId(null);
    }
  };

  const btn =
    "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4">
      {toast && (
        <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
      )}

      {/* Upload a new CV */}
      <div className="flex items-end gap-2 flex-wrap bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            CV Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Tailored for Senior React role"
            maxLength={255}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            CV File (PDF, DOC, DOCX)
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border file:border-slate-200 file:text-[11px] file:font-bold file:text-slate-700 file:bg-white hover:file:bg-slate-100 file:cursor-pointer"
          />
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7E8920] text-white text-xs font-bold hover:bg-[#6b7519] disabled:opacity-50 transition-all"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Upload CV"}
        </button>
      </div>

      {/* CV list */}
      {cvs.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold">No CVs yet. Upload the first one above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[640px]">
            <thead className="border-b border-slate-200/80 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 pr-3">CV</th>
                <th className="py-2.5 pr-3">Description</th>
                <th className="py-2.5 pr-3">Submitted</th>
                <th className="py-2.5 pr-3">Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cvs.map((cv) => (
                <tr key={cv.id} className={cv.isObsolete ? "opacity-70" : ""}>
                  <td className="py-2.5 pr-3">
                    <p className="font-bold text-slate-900 break-all">{cv.fileName}</p>
                    <p className="font-mono text-[10px] text-slate-400">CV ID: {cv.id.slice(0, 8)}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600 max-w-[220px]">
                    {cv.description || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                    {new Date(cv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 pr-3">
                    {cv.isObsolete ? <Badge variant="red">Obsolete</Badge> : <Badge variant="green">Current</Badge>}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <ResumePreviewModal
                        fileId={cv.id}
                        fileName={cv.fileName}
                        candidateName={candidateName}
                        triggerLabel="View"
                        triggerVariant="outline"
                        triggerSize="sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleObsolete(cv)}
                        disabled={busyId === cv.id}
                        title={cv.isObsolete ? "Restore CV" : "Mark as obsolete"}
                        className={`${btn} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                      >
                        {busyId === cv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : cv.isObsolete ? (
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                        {cv.isObsolete ? "Restore" : "Obsolete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cv)}
                        disabled={busyId === cv.id}
                        title="Delete CV"
                        className={`${btn} border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
