"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface ClientOpt {
  id: string;
  name: string;
  code: string;
}

interface ProjectOpt {
  id: string;
  name: string;
}

/** Client + Project + submission-date-range filters. Syncs URL params. */
export function SubmissionsFilters({
  clients,
  projects,
}: {
  clients: ClientOpt[];
  projects: ProjectOpt[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = searchParams.get("clientId") || "";
  const projectId = searchParams.get("projectId") || "";
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  const push = (params: URLSearchParams) => {
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/submissions?${qs}` : "/admin/submissions");
  };

  const handleClient = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("clientId", value);
    else params.delete("clientId");
    params.delete("projectId"); // projects are client-scoped
    push(params);
  };

  const handleProject = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("projectId", value);
    else params.delete("projectId");
    push(params);
  };

  const applyDates = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    push(params);
  };

  const clearDates = () => {
    setFrom("");
    setTo("");
    applyDates("", "");
  };

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-2 flex-wrap">
      <div className="w-64">
        <SearchableSelect
          value={clientId}
          onChange={handleClient}
          placeholder="All clients"
          options={[
            { value: "", label: "All clients" },
            ...clients.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
          ]}
        />
      </div>
      <div className="w-64">
        <SearchableSelect
          value={projectId}
          onChange={handleProject}
          placeholder={clientId ? "All projects" : "All projects"}
          options={[
            { value: "", label: "All projects" },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          Submitted
        </label>
        <input
          type="date"
          aria-label="Submitted from"
          value={from}
          max={to || undefined}
          onChange={(e) => {
            setFrom(e.target.value);
            applyDates(e.target.value, to);
          }}
          className="border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7E8920]/20 focus:border-[#7E8920] bg-white"
        />
        <span className="text-xs text-slate-400 font-bold">to</span>
        <input
          type="date"
          aria-label="Submitted to"
          value={to}
          min={from || undefined}
          onChange={(e) => {
            setTo(e.target.value);
            applyDates(from, e.target.value);
          }}
          className="border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7E8920]/20 focus:border-[#7E8920] bg-white"
        />
        {(from || to) && (
          <button
            type="button"
            onClick={clearDates}
            className="text-[11px] font-bold text-blue-600 hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
}
