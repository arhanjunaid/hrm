import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateClient } from "@/services/client.service";

async function handleUpdate(
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
    const { name, code, contactName, contactEmail, contactPhone, notes, status, crmStatus, clientType } = body;

    await updateClient(
      clientId,
      { name, code, contactName, contactEmail, contactPhone, notes, status, crmStatus, clientType },
      session.id
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err.message || "Failed to update client.";
    const status = message.includes("NOT_FOUND") ? 404 : message.includes("unique") ? 400 : 400;
    const msg = err.message?.includes("unique") && !message.includes("NOT_FOUND")
      ? "A client with that code already exists."
      : message;
    return NextResponse.json({ success: false, error: { message: msg } }, { status });
  }
}

export const PUT = handleUpdate;
export const PATCH = handleUpdate;
