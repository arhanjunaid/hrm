import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { candidates } from "@/db/schema";
import { or, like, desc } from "drizzle-orm";

/** Type-ahead search over the candidate pool, including each candidate's CVs. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50, 100);

    const term = `%${q}%`;
    const rows = await db.query.candidates.findMany({
      where: q
        ? or(
            like(candidates.name, term),
            like(candidates.email, term),
            like(candidates.phone, term),
            like(candidates.skills, term),
            like(candidates.currentCompany, term)
          )
        : undefined,
      limit,
      orderBy: [desc(candidates.createdAt)],
      with: {
        files: {
          columns: {
            id: true,
            fileName: true,
            description: true,
            isObsolete: true,
            createdAt: true,
          },
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        },
      },
    });

    return NextResponse.json({
      success: true,
      candidates: rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalExperience: c.totalExperience,
        currentCompany: c.currentCompany,
        currentDesignation: c.currentDesignation,
        cvs: c.files,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Search failed." } },
      { status: 500 }
    );
  }
}
