import { requireAdmin } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientsClient } from "../clients/ClientsClient";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { vendors } from "@/db/schema";

export default async function AdminProspectsPage() {
  const user = await requireAdmin();

  // Prospects only: Type = "P"
  const prospectList = await db.query.vendors.findMany({
    where: eq(vendors.clientType, "P"),
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
      <ClientsClient initialClients={prospectList} mode="prospects" />
    </DashboardLayout>
  );
}
