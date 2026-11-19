"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, Mail, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";

export interface SubmissionRow {
  id: string;
  candidateName: string;
  candidateCompany: string;
  jobTitle: string;
  jobCode: string;
  projectName: string;
  clientName: string;
  status: string;
  lastFeedback: { overallRating: number; recommendation: string } | null;
  submittedOn: string;
}

/** Submissions table with multi-select + "email selected to me" action. */
export function SubmissionsTable({ submissions }: { submissions: SubmissionRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; title: string; message?: string } | null>(null);

  const allSelected = submissions.length > 0 && selected.size === submissions.length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(submissions.map((s) => s.id)));
  };

  const handleEmailSelf = async () => {
    if (selected.size === 0) {
      setToast({ type: "error", title: "Nothing selected", message: "Select at least one submission to email." });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/submissions/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToast({ type: "error", title: "Email failed", message: data.error?.message || "Could not send email." });
        return;
      }
      if (data.emailed) {
        const skippedNote =
          data.skipped?.length > 0 ? ` ${data.skipped.length} CV(s) could not be attached.` : "";
        setToast({
          type: "success",
          title: "Email sent",
          message: `${data.submissionCount} submission(s) with ${data.attachmentCount} CV(s) emailed to you.${skippedNote}`,
        });
        setSelected(new Set());
      } else {
        setToast({
          type: "error",
          title: "Email not sent",
          message:
            data.error === "SMTP_NOT_CONFIGURED"
              ? "SMTP is not configured — ask your administrator to configure email sending."
              : data.error || "Email could not be sent.",
        });
      }
    } catch {
      setToast({ type: "error", title: "Network error", message: "Failed to reach server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {toast && (
        <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500">
          {selected.size > 0
            ? `${selected.size} submission(s) selected`
            : "Select submissions to email them to yourself"}
        </p>
        <button
          type="button"
          onClick={handleEmailSelf}
          disabled={loading || selected.size === 0}
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#7E8920] text-white hover:bg-[#6b7519] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Email selected to me
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3.5">Candidate</th>
                <th className="px-4 py-3.5">Job Description</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Current Status</th>
                <th className="px-4 py-3.5">Last Feedback</th>
                <th className="px-4 py-3.5">Submitted On</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-medium">
                    No candidate submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(sub.id)}
                        onChange={() => toggle(sub.id)}
                        aria-label={`Select ${sub.candidateName}`}
                      />
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div>
                        <span>{sub.candidateName}</span>
                        <p className="text-xs text-slate-500 font-normal">{sub.candidateCompany}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-bold text-slate-900">{sub.jobTitle}</p>
                      <p className="font-mono text-slate-500">{sub.jobCode}</p>
                      <p className="text-slate-500">{sub.projectName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">{sub.clientName}</td>
                    <td className="px-4 py-3.5">
                      <Badge status={sub.status}>{sub.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {sub.lastFeedback ? (
                        <span className="font-semibold text-purple-700">
                          Rating: {sub.lastFeedback.overallRating}/5 ({sub.lastFeedback.recommendation})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No feedback yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{sub.submittedOn}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </Link>
                      </div>
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
