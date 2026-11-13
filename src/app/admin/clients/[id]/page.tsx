import React from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getClientById } from "@/services/client.service";
import { ClientDetailClient } from "./ClientDetailClient";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id: clientId } = await params;

  let client;
  try {
    client = await getClientById(clientId);
  } catch {
    notFound();
  }

  return (
    <DashboardLayout user={user}>
      <ClientDetailClient initialClient={JSON.parse(JSON.stringify(client))} />
    </DashboardLayout>
  );
}
