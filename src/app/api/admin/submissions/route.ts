import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { submitCandidateToJob } from "@/services/submission.service";

/** Submit an existing candidate (with a chosen CV) to a Job Description. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const body = await req.json();
    const { jobId, candidateId, resumeFileId } = body;
    if (!jobId || !candidateId || !resumeFileId) {
      return NextResponse.json(
        { success: false, error: { message: "jobId, candidateId, and resumeFileId are required." } },
        { status: 400 }
      );
    }

    const submissionId = await submitCandidateToJob(jobId, candidateId, resumeFileId, session.id);
    return NextResponse.json({ success: true, submissionId });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to submit candidate." } },
      { status: 400 }
    );
  }
}
