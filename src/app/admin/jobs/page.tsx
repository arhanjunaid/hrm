import React, { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getJobs } from "@/services/job.service";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Upload } from "lucide-react";
import { AdminJobTable } from "./AdminJobTable";
import { ClientFilter } from "@/components/admin/ClientFilter";
import { db } from "@/db";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; clientId?: string }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;

  const status = params.status || "ALL";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const clientId = params.clientId || "";

  const [{ jobs, total, totalPages }, clientList] = await Promise.all([
    getJobs({
      status,
      search,
      page,
      limit: 25,
      vendorId: clientId || undefined,
    }),
    db.query.vendors.findMany({
      where: (t, { eq }) => eq(t.status, "ACTIVE"),
      columns: { id: true, name: true, code: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
  ]);

  const statusTabs = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "WIP", value: "WIP" },
    { label: "On Hold", value: "ON_HOLD" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  const tableJobs = jobs.map((job) => ({
    id: job.id,
    jobCode: job.jobCode,
    title: job.title,
    location: job.location,
    numPositions: job.numPositions,
    priority: job.priority,
    status: job.status,
    dateReceived: job.dateReceived ? String(job.dateReceived) : null,
    department: job.department ?? null,
    vendorName: job.vendor?.name ?? "—",
    projectName: (job as any).project?.name ?? "—",
    disciplineName: (job as any).discipline?.name ?? job.department ?? "—",
    submissionCount: job.submissions?.length ?? 0,
  }));

  const tabHref = (tab: string) => {
    const qs = new URLSearchParams();
    qs.set("status", tab);
    if (clientId) qs.set("clientId", clientId);
    return `/admin/jobs?${qs.toString()}`;
  };

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    qs.set("status", status);
    if (clientId) qs.set("clientId", clientId);
    qs.set("page", String(p));
    return `/admin/jobs?${qs.toString()}`;
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Job Descriptions</h2>
            <p className="text-sm text-slate-500 mt-1">All Job Descriptions across all clients.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/jobs/import"
              className="inline-flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
            >
              <Upload className="w-4 h-4" /> Import Spreadsheet
            </Link>
            <Link
              href="/admin/jobs/new"
              className="inline-flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl bg-[#7E8920] text-white hover:bg-[#6b7519] shadow-2xs transition-all"
            >
              <Plus className="w-4 h-4" /> New Job Description
            </Link>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-2 flex-wrap">
          <Suspense>
            <ClientFilter clients={clientList} />
          </Suspense>
          <div className="w-px h-8 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2 overflow-x-auto">
            {statusTabs.map((tab) => (
              <Link
                key={tab.value}
                href={tabHref(tab.value)}
                className={`px-4 py-2 text-xs font-black rounded-full whitespace-nowrap transition-all ${
                  status === tab.value
                    ? "bg-[#7E8920] text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-300/80 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-2xs p-6 overflow-hidden">
          <AdminJobTable jobs={tableJobs} />
          <div className="pt-4 border-t border-slate-100 mt-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalRecords={total}
              pageSize={25}
              getPageUrl={pageHref}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
