import React, { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCandidates } from "@/services/candidate.service";
import { getJobById } from "@/services/job.service";
import { SubmitCandidateModal, SubmitDefaults } from "./SubmitCandidateModal";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { ClientFilter } from "@/components/admin/ClientFilter";
import { db } from "@/db";

import { ResumePreviewModal } from "@/components/ui/ResumePreviewModal";
import { CandidateManageActions } from "@/components/admin/CandidateManageActions";

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; jobId?: string; clientId?: string }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;

  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const jobId = params.jobId || "";
  const clientId = params.clientId || "";

  const [{ candidates, total, totalPages }, clientList] = await Promise.all([
    getCandidates({ search, page, limit: 25, clientId: clientId || undefined }),
    db.query.vendors.findMany({
      where: (t, { eq }) => eq(t.status, "ACTIVE"),
      columns: { id: true, name: true, code: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
  ]);

  // Prefill the submit flow when landing here from a JD (?jobId=...)
  let defaultSelection: SubmitDefaults | undefined;
  if (jobId) {
    try {
      const job = await getJobById(jobId);
      defaultSelection = {
        clientId: job.vendorId,
        clientName: job.vendor.name,
        projectId: job.projectId ?? "",
        projectName: (job as any).project?.name ?? "",
        jobId: job.id,
        jobCode: job.jobCode,
        jobTitle: job.title,
      };
    } catch {
      defaultSelection = undefined;
    }
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Candidates</h2>
            <p className="text-sm text-slate-500 mt-1">
              Search the candidate pool and submit candidates against Client Job Descriptions.
            </p>
          </div>
          <SubmitCandidateModal defaultSelection={defaultSelection} />
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-2 flex-wrap">
          <Suspense>
            <ClientFilter clients={clientList} />
          </Suspense>
          <p className="text-[11px] text-slate-400 font-medium">
            {clientId ? `Showing candidates submitted to the selected client (${total}).` : `Showing all candidates (${total}).`}
          </p>
        </div>

        {/* Candidate List Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Candidate Name</th>
                  <th className="px-4 py-3.5">Experience</th>
                  <th className="px-4 py-3.5">Current Role</th>
                  <th className="px-4 py-3.5">Skills</th>
                  <th className="px-4 py-3.5">Active Submissions</th>
                  <th className="px-4 py-3.5">Resume</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">
                      No candidates found in pool.
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand) => {
                    const primaryFile = cand.files.find((f) => !f.isObsolete) ?? cand.files[0];
                    return (
                      <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <div>
                            <Link href={`/admin/candidates/${cand.id}`} className="hover:underline hover:text-brand-600 transition-colors">
                              {cand.name}
                            </Link>
                            <p className="text-xs text-slate-500 font-normal">{cand.email} • {cand.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                          {cand.totalExperience} Yrs Total ({cand.relevantExperience} Relevant)
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700">
                          <p className="font-semibold">{cand.currentDesignation || "N/A"}</p>
                          <p className="text-slate-500">{cand.currentCompany || "N/A"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                          {cand.skills}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {cand.submissions.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Not submitted</span>
                            ) : (
                              cand.submissions.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/admin/submissions/${sub.id}`}
                                  className="inline-block"
                                >
                                  <Badge status={sub.status}>{sub.job?.title || "Job"}</Badge>
                                </Link>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {primaryFile ? (
                            <ResumePreviewModal
                              fileId={primaryFile.id}
                              fileName={primaryFile.fileName}
                              candidateName={cand.name}
                              triggerLabel="Preview Resume"
                              triggerVariant="link"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <CandidateManageActions
                            candidateId={cand.id}
                            candidateName={cand.name}
                            fileId={primaryFile?.id}
                            hasSubmissions={cand.submissions.length > 0}
                            variant="compact"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
