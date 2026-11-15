import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/services/client.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, contactName, contactEmail, contactPhone, notes, status, crmStatus, clientType } = body;

    const id = await createClient(
      { name, code, contactName, contactEmail, contactPhone, notes, status, crmStatus, clientType },
      session.id
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    const msg = err.message?.includes("unique")
      ? "A client with that code already exists."
      : err.message;
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 400 });
  }
}
