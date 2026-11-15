import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateCommunication, deleteCommunication } from "@/services/client.service";

async function handleUpdate(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id: clientId, commId } = await params;

    let input: Record<string, any>;
    let file: { fileBuffer: Buffer; fileName: string; mimeType: string } | null = null;
    let removeFile = false;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      input = {
        contactDate: String(form.get("contactDate") || ""),
        initiatedBy: String(form.get("initiatedBy") || ""),
        source: String(form.get("source") || ""),
        description: String(form.get("description") || ""),
        actionRequired: (form.get("actionRequired") as string) || null,
        dueDate: (form.get("dueDate") as string) || null,
      };
      removeFile = String(form.get("removeFile") || "") === "true";
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
      input = {
        contactDate: body.contactDate,
        initiatedBy: body.initiatedBy,
        source: body.source,
        description: body.description,
        actionRequired: body.actionRequired,
        dueDate: body.dueDate,
      };
      removeFile = body.removeFile === true;
    }

    await updateCommunication(clientId, commId, input, session.id, file, removeFile);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err.message || "Failed to update communication.";
    const status = message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id: clientId, commId } = await params;
    await deleteCommunication(clientId, commId, session.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err.message || "Failed to delete communication.";
    const status = message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}

export const PUT = handleUpdate;
export const PATCH = handleUpdate;
