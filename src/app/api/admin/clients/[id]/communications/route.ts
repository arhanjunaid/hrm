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
    const body = await req.json();
    const { contactDate, initiatedBy, source, description, actionRequired, dueDate } = body;

    const id = await createCommunication(
      clientId,
      { contactDate, initiatedBy, source, description, actionRequired, dueDate },
      session.id
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    const message = err.message || "Failed to record communication.";
    const status = message.includes("CLIENT_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}
