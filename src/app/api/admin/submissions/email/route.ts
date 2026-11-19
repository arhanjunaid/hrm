import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { emailSubmissionsToSelf } from "@/services/submission.service";

/** Email selected submissions to the requesting admin, with CVs attached. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const body = await req.json();
    const submissionIds: string[] = body.submissionIds || [];
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "Select at least one submission to email." } },
        { status: 400 }
      );
    }

    const result = await emailSubmissionsToSelf(submissionIds, session.id, session.email);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 400 });
  }
}
