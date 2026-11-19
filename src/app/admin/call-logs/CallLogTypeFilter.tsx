"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** All / Clients Only / Prospects Only filter for the Call Logs page. Syncs ?clientType= in the URL. */
export function CallLogTypeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("clientType") || "ALL";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set("clientType", value);
    else params.delete("clientType");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/call-logs?${qs}` : "/admin/call-logs");
  };

  return (
    <div className="w-48">
      <select
        aria-label="Filter by client type"
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-[#7E8920]/20 focus:border-[#7E8920] transition-all"
      >
        <option value="ALL">All</option>
        <option value="C">Clients Only</option>
        <option value="P">Prospects Only</option>
      </select>
    </div>
  );
}
