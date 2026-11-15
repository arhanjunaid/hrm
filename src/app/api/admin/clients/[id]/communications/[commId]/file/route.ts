import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCommunicationFileStream } from "@/services/client.service";

/** View the file attached to a communication-log entry inline. Admin only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id: clientId, commId } = await params;
    const { stream, fileName, mimeType, fileSize } = await getCommunicationFileStream(
      clientId,
      commId,
      session.id
    );

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        ...(fileSize ? { "Content-Length": fileSize.toString() } : {}),
      },
    });
  } catch (err: any) {
    const message = err.message || "Failed to view file.";
    const status = message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ success: false, error: { message } }, { status });
  }
}
