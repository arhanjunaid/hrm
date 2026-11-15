import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { setResumeObsolete, deleteCandidateResume } from "@/services/candidate.service";

/** Mark a CV obsolete / restore it. Body: { isObsolete: boolean }. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id, fileId } = await params;
    const body = await request.json();
    await setResumeObsolete(id, fileId, body.isObsolete === true, session.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err.message || "Failed to update CV.";
    const status = message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}

/** Delete one CV of a candidate. Refused when the CV is linked to a submission. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id, fileId } = await params;
    await deleteCandidateResume(id, session.id, fileId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err.message || "Failed to delete CV.";
    const status = message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}
