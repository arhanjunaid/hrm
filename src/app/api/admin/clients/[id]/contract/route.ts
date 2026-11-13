import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadClientContract, getClientContractStream } from "@/services/client.service";
import mammoth from "mammoth";
import { Readable } from "stream";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Upload (or replace) the client's signed contract. Admin only. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: { message: "Admin access required." } }, { status: 403 });
    }

    const { id: clientId } = await params;
    const formData = await request.formData();
    const contractFile = formData.get("contract") as File;
    if (!contractFile) {
      return NextResponse.json({ success: false, error: { message: "Contract file is required." } }, { status: 400 });
    }

    const buffer = Buffer.from(await contractFile.arrayBuffer());
    await uploadClientContract(
      clientId,
      {
        contractBuffer: buffer,
        contractFileName: contractFile.name,
        mimeType: contractFile.type || "application/octet-stream",
      },
      session.id
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to upload contract." } },
      { status: 400 }
    );
  }
}

/** View the client's signed contract inline. Admin only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required to view contract." } },
        { status: 403 }
      );
    }

    const { id: clientId } = await params;
    const { stream, fileName, mimeType, fileSize } = await getClientContractStream(clientId, session.id);

    const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

    // For Word documents, convert to styled HTML so the browser renders inline
    if (ext === ".docx" || ext === ".doc") {
      try {
        const buffer = await streamToBuffer(stream);
        const result = await mammoth.convertToHtml({ buffer });
        const htmlContent = result.value || "<p>No readable text content found in document.</p>";
        const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${fileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #ffffff; padding: 2.5rem; max-width: 850px; margin: 0 auto; }
    h1, h2, h3, h4, h5, h6 { color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; }
    p { margin-bottom: 1em; }
    table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background-color: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;
        return new NextResponse(styledHtml, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": "inline" },
        });
      } catch (convErr) {
        console.error("Mammoth conversion error:", convErr);
      }
    }

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
        "Content-Type": ext === ".pdf" ? "application/pdf" : mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        ...(fileSize ? { "Content-Length": fileSize.toString() } : {}),
      },
    });
  } catch (err: any) {
    const message = err.message || "Failed to view contract.";
    const status = message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json(
      { success: false, error: { code: "VIEW_FAILED", message } },
      { status }
    );
  }
}
