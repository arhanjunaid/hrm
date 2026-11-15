import { requireAdmin } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsClient } from "./ClientsClient";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { vendors } from "@/db/schema";

export default async function AdminClientsPage() {
  const user = await requireAdmin();

  // Clients only: Type = "C"
  const clientList = await db.query.vendors.findMany({
    where: eq(vendors.clientType, "C"),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      users: true,
      jobDescriptions: true,
      submissions: true,
      projects: true,
    },
  });

  return (
    <DashboardLayout user={user}>
      <ClientsClient initialClients={clientList} mode="clients" />
    </DashboardLayout>
  );
}
