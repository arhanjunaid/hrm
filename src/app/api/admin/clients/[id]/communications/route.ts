import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCommunications, createCommunication } from "@/services/client.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id: clientId } = await params;
    const communications = await listCommunications(clientId);
    return NextResponse.json({ success: true, data: communications });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to load communications." } },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id: clientId } = await params;

    // Accept multipart (with optional file) as well as plain JSON.
    let contactDate: string;
    let initiatedBy: string;
    let source: string;
    let description: string;
    let actionRequired: string | undefined;
    let dueDate: string | undefined;
    let file: { fileBuffer: Buffer; fileName: string; mimeType: string } | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      contactDate = String(form.get("contactDate") || "");
      initiatedBy = String(form.get("initiatedBy") || "");
      source = String(form.get("source") || "");
      description = String(form.get("description") || "");
      actionRequired = (form.get("actionRequired") as string) || undefined;
      dueDate = (form.get("dueDate") as string) || undefined;
      const upload = form.get("file") as File | null;
      if (upload && upload.size > 0) {
        file = {
          fileBuffer: Buffer.from(await upload.arrayBuffer()),
          fileName: upload.name,
          mimeType: upload.type || "application/octet-stream",
        };
      }
    } else {
      const body = await req.json();
      ({ contactDate, initiatedBy, source, description, actionRequired, dueDate } = body);
    }

    const id = await createCommunication(
      clientId,
      { contactDate, initiatedBy, source, description, actionRequired, dueDate },
      session.id,
      file
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    const message = err.message || "Failed to record communication.";
    const status = message.includes("CLIENT_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}
