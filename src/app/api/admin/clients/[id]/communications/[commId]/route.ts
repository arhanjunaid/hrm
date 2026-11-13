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
    const body = await req.json();
    const { contactDate, initiatedBy, source, description, actionRequired, dueDate } = body;

    await updateCommunication(
      clientId,
      commId,
      { contactDate, initiatedBy, source, description, actionRequired, dueDate },
      session.id
    );

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
