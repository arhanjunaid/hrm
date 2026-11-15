import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { addCandidateResume } from "@/services/candidate.service";

/** Upload an additional CV for a candidate. Multipart: resume (file) + description (text). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const resumeFile = formData.get("resume") as File | null;
    if (!resumeFile) {
      return NextResponse.json({ success: false, error: { message: "Resume file is required." } }, { status: 400 });
    }
    const description = (formData.get("description") as string) || "";

    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const result = await addCandidateResume(
      id,
      {
        resumeBuffer: buffer,
        resumeFileName: resumeFile.name,
        mimeType: resumeFile.type || "application/pdf",
        description,
      },
      session.id
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    const message = err.message || "Failed to upload CV.";
    const status = message.includes("CANDIDATE_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}
