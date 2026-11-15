import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { jobDescriptions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Cascading options for the Submit-a-Candidate flow:
 * clients (all active) -> projects of client -> JDs of client/project.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const clientId = req.nextUrl.searchParams.get("clientId") || "";
    const projectId = req.nextUrl.searchParams.get("projectId") || "";

    const clients = await db.query.vendors.findMany({
      where: (t, { eq }) => eq(t.status, "ACTIVE"),
      columns: { id: true, name: true, code: true, clientType: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    });

    const projects = clientId
      ? await db.query.projects.findMany({
          where: (t, { eq }) => eq(t.clientId, clientId),
          columns: { id: true, name: true, status: true },
          orderBy: (t, { asc }) => [asc(t.name)],
        })
      : [];

    let jobs: Array<{
      id: string;
      jobCode: string;
      title: string;
      status: string;
      projectId: string | null;
      projectName: string | null;
    }> = [];
    if (clientId) {
      const conditions = [eq(jobDescriptions.vendorId, clientId)];
      if (projectId) conditions.push(eq(jobDescriptions.projectId, projectId));
      const rows = await db.query.jobDescriptions.findMany({
        where: and(...conditions),
        columns: { id: true, jobCode: true, title: true, status: true, projectId: true },
        orderBy: [desc(jobDescriptions.createdAt)],
        with: { project: { columns: { id: true, name: true } } },
      });
      jobs = rows.map((j) => ({
        id: j.id,
        jobCode: j.jobCode,
        title: j.title,
        status: j.status,
        projectId: j.projectId,
        projectName: j.project?.name ?? null,
      }));
    }

    return NextResponse.json({ success: true, clients, projects, jobs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to load options." } },
      { status: 500 }
    );
  }
}
