"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface ClientOpt {
  id: string;
  name: string;
  code: string;
}

/** Client dropdown filter for server-rendered list pages. Syncs ?clientId= in the URL. */
export function ClientFilter({
  clients,
  paramName = "clientId",
}: {
  clients: ClientOpt[];
  paramName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) || "";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramName, value);
    else params.delete(paramName);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
  };

  return (
    <div className="w-64">
      <SearchableSelect
        value={current}
        onChange={handleChange}
        placeholder="All clients"
        options={[
          { value: "", label: "All clients" },
          ...clients.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
        ]}
      />
    </div>
  );
}
