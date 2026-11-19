import React, { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getSubmissions } from "@/services/submission.service";
import { Pagination } from "@/components/ui/Pagination";
import { SubmissionsFilters } from "./SubmissionsFilters";
import { SubmissionsTable, SubmissionRow } from "./SubmissionsTable";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    page?: string;
    clientId?: string;
    projectId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;
  const status = params.status || "ALL";
  const page = parseInt(params.page || "1", 10);
  const clientId = params.clientId || "";
  const projectId = params.projectId || "";
  const from = params.from || "";
  const to = params.to || "";

  const [{ submissions, total, totalPages }, clientList, projectList] = await Promise.all([
    getSubmissions({
      status,
      page,
      limit: 25,
      vendorId: clientId || undefined,
      projectId: projectId || undefined,
      fromDate: from || undefined,
      toDate: to || undefined,
    }),
    db.query.vendors.findMany({
      where: (t, { eq }) => eq(t.status, "ACTIVE"),
      columns: { id: true, name: true, code: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    db.query.projects.findMany({
      where: clientId ? eq(projects.clientId, clientId) : undefined,
      orderBy: (t, { asc }) => [asc(t.name)],
      columns: { id: true, name: true },
    }),
  ]);

  const rows: SubmissionRow[] = submissions.map((sub) => {
    const lastFb = sub.feedbackList[0];
    return {
      id: sub.id,
      candidateName: sub.candidate.name,
      candidateCompany: sub.candidate.currentCompany || "N/A",
      jobTitle: sub.job.title,
      jobCode: sub.job.jobCode,
      projectName: (sub.job as unknown as { project?: { name: string } | null }).project?.name ?? "—",
      clientName: sub.vendor.name,
      status: sub.status,
      lastFeedback: lastFb
        ? { overallRating: lastFb.overallRating, recommendation: lastFb.recommendation }
        : null,
      submittedOn: new Date(sub.createdAt).toLocaleDateString(),
    };
  });

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (status !== "ALL") qs.set("status", status);
    if (clientId) qs.set("clientId", clientId);
    if (projectId) qs.set("projectId", projectId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    qs.set("page", String(p));
    return `/admin/submissions?${qs.toString()}`;
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Candidate Submissions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Global view of candidate submissions sent to recruitment vendors and real-time status tracking — {total} total.
          </p>
        </div>

        <Suspense>
          <SubmissionsFilters clients={clientList} projects={projectList} />
        </Suspense>

        <SubmissionsTable submissions={rows} />

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalRecords={total}
            pageSize={25}
            getPageUrl={pageHref}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
