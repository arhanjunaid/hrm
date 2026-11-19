import React, { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { listAllCommunications } from "@/services/client.service";
import { getAllStatusMasters } from "@/services/status.service";
import { Pagination } from "@/components/ui/Pagination";
import { ClientFilter } from "@/components/admin/ClientFilter";
import { CallLogTypeFilter } from "./CallLogTypeFilter";
import { AddCallLogModal } from "./AddCallLogModal";
import { Badge } from "@/components/ui/Badge";
import { Paperclip, Phone } from "lucide-react";
import { db } from "@/db";
import {
  COMMUNICATION_INITIATED_BY_LABELS,
  COMMUNICATION_SOURCE_LABELS,
} from "@/lib/crm/constants";

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(typeof value === "string" && value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

export default async function AdminCallLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; clientId?: string; clientType?: string }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;

  const page = parseInt(params.page || "1", 10);
  const clientId = params.clientId || "";
  const clientType = params.clientType || "ALL";

  const [{ communications, total, totalPages }, clientList, sourceRows] = await Promise.all([
    listAllCommunications({
      clientId: clientId || undefined,
      clientType: clientType === "C" || clientType === "P" ? clientType : undefined,
      page,
      limit: 25,
    }),
    db.query.vendors.findMany({
      where: (t, { eq }) => eq(t.status, "ACTIVE"),
      columns: { id: true, name: true, code: true, clientType: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    getAllStatusMasters("COMM_SOURCE"),
  ]);

  const sourceLabels = new Map(sourceRows.map((s) => [s.code, s.description]));
  const sourceLabel = (code: string) =>
    sourceLabels.get(code) ??
    COMMUNICATION_SOURCE_LABELS[code as keyof typeof COMMUNICATION_SOURCE_LABELS] ??
    code;

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (clientId) qs.set("clientId", clientId);
    if (clientType === "C" || clientType === "P") qs.set("clientType", clientType);
    qs.set("page", String(p));
    return `/admin/call-logs?${qs.toString()}`;
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Call Logs</h2>
            <p className="text-sm text-slate-500 mt-1">
              Every client and prospect communication log entry in one place — {total} total.
            </p>
          </div>
          <AddCallLogModal clients={clientList} />
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-2 flex-wrap">
          <Suspense>
            <ClientFilter clients={clientList} />
          </Suspense>
          <Suspense>
            <CallLogTypeFilter />
          </Suspense>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-2xs p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[1000px]">
              <thead className="border-b border-slate-200/80 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Initiated By</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Action Required</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">File</th>
                  <th className="py-3 px-4">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {communications.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <Phone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 font-medium text-sm">No call log entries found.</p>
                    </td>
                  </tr>
                ) : (
                  communications.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {formatDate(c.contactDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/clients/${c.clientId}`}
                          className="font-extrabold text-slate-900 hover:text-[#7E8920] hover:underline whitespace-nowrap"
                        >
                          {c.client?.name ?? "—"}
                        </Link>
                        {c.client && (
                          <span className="ml-1.5">
                            <Badge variant={c.client.clientType === "P" ? "purple" : "blue"} size="sm">
                              {c.client.clientType === "P" ? "Prospect" : "Client"}
                            </Badge>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {COMMUNICATION_INITIATED_BY_LABELS[
                          c.initiatedBy as keyof typeof COMMUNICATION_INITIATED_BY_LABELS
                        ] ?? c.initiatedBy}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{sourceLabel(c.source)}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[280px]">{c.description}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px]">{c.actionRequired || "—"}</td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{formatDate(c.dueDate)}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[160px]">
                        {c.fileName ? (
                          <a
                            href={`/api/admin/clients/${c.clientId}/communications/${c.id}/file`}
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
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {c.createdByUser?.name ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
